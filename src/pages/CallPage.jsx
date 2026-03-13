import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, MicOff, PhoneOff, Phone } from "lucide-react";
import { Conversation } from "@elevenlabs/client";
import { supabase } from "../lib/supabase";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import NoElevenLabsBanner from "../components/NoElevenLabsBanner";

// State machine: IDLE → CONNECTING → ACTIVE → ENDING → IDLE
const STATES = { IDLE: "IDLE", CONNECTING: "CONNECTING", ACTIVE: "ACTIVE", ENDING: "ENDING" };

function Waveform() {
  return (
    <div className="flex items-center gap-1 h-12 justify-center">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="w-1 bg-accent rounded-full animate-wave"
          style={{ animationDelay: `${i * 0.08}s` }}
        />
      ))}
    </div>
  );
}

const ELEVENLABS_CONFIGURED = !!(import.meta.env.VITE_ELEVENLABS_AGENT_ID?.trim());

export default function CallPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState(STATES.IDLE);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [callId, setCallId] = useState(null);
  const [postCall, setPostCall] = useState(null); // { ticketId, ticketNumber, outcome }
  const [error, setError] = useState(null);

  const wsRef = useRef(null);           // bridge WebSocket (session mgmt only)
  const convRef = useRef(null);          // ElevenLabs SDK Conversation
  const micStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Clean up on unmount
  useEffect(() => () => { stopMedia(); wsRef.current?.close(); }, []);

  function stopMedia() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
    convRef.current?.endSession().catch(() => {});
    convRef.current = null;
  }

  function handleCallEnded(msg) {
    stopMedia();
    const ticketId = msg.ticket_id || null;
    const ticketNumber = msg.ticket_number || null;
    const outcome = msg.outcome || null;
    setPostCall({ ticketId, ticketNumber, outcome });
    setState(STATES.IDLE);
  }

  async function startCall() {
    setError(null);
    setState(STATES.CONNECTING);

    // Step 1: create session via bridge WebSocket
    const wsUrl = import.meta.env.VITE_WS_BRIDGE;
    let sessionId = null;
    try {
      sessionId = await new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        const timeout = setTimeout(() => reject(new Error('Bridge timeout')), 8000);
        ws.onopen = () => ws.send(JSON.stringify({ type: 'start_call', user_id: session?.user?.id }));
        ws.onmessage = (evt) => {
          if (typeof evt.data !== 'string') return;
          let msg; try { msg = JSON.parse(evt.data); } catch { return; }
          if (msg.type === 'call_started') { clearTimeout(timeout); resolve(msg.call_id); }
          if (msg.type === 'error') { clearTimeout(timeout); reject(new Error(msg.message)); }
        };
        ws.onerror = () => { clearTimeout(timeout); reject(new Error('Bridge connection failed')); };
      });
    } catch (err) {
      setError(`Could not connect to call server: ${err.message}`);
      setState(STATES.IDLE);
      return;
    }

    setCallId(sessionId);

    // Step 2: start ElevenLabs conversation directly via SDK
    try {
      const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID;
      const conv = await Conversation.startSession({
        agentId,
        dynamicVariables: { customer_id: session?.user?.id || '' },
        onConnect: ({ conversationId }) => {
          setState(STATES.ACTIVE);
          // Register conversation_id with bridge so tool webhooks can resolve session_id
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'register_conversation',
              conversation_id: conversationId,
            }));
          }
        },
        onDisconnect: () => {
          // Agent ended naturally — bridge will detect ElevenLabs WS close and send call_ended.
          // Do NOT send end_call here; that would race with the agent's final ticket number speech.
        },
        onMessage: (msg) => {
          const speaker = msg.source === 'ai' ? 'agent' : msg.source === 'user' ? 'customer' : null;
          if (speaker && msg.message) {
            setTranscript(prev => [...prev, { speaker, message: msg.message }]);
            // Persist via bridge WebSocket (avoids CORS issues with HTTP fetch)
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'transcript', speaker, message: msg.message }));
            }
          }
        },
        onError: (err) => {
          console.error('[CallPage] ElevenLabs error:', err);
        },
      });
      convRef.current = conv;
    } catch (err) {
      setError(`Could not start voice session: ${err.message}`);
      wsRef.current?.close();
      setState(STATES.IDLE);
      return;
    }

    // Step 3: listen to bridge for call_ended (admin end or ticket info)
    if (wsRef.current) {
      wsRef.current.onmessage = (evt) => {
        if (typeof evt.data !== 'string') return;
        let msg; try { msg = JSON.parse(evt.data); } catch { return; }
        if (msg.type === 'call_ended') handleCallEnded(msg);
      };
      wsRef.current.onclose = () => {};
    }
  }

  function toggleMute() {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (convRef.current) {
      if (newMuted) convRef.current.setMuted(true);
      else convRef.current.setMuted(false);
    }
    wsRef.current?.send(JSON.stringify({ type: newMuted ? 'mute' : 'unmute' }));
  }

  function endCall() {
    setState(STATES.ENDING);
    convRef.current?.endSession().catch(() => {});
    convRef.current = null;
    wsRef.current?.send(JSON.stringify({ type: 'end_call' }));
    setTimeout(() => {
      wsRef.current?.close();
      stopMedia();
      if (state !== STATES.IDLE) setState(STATES.IDLE);
    }, 1500);
  }

  function resetCall() {
    setPostCall(null);
    setTranscript([]);
    setCallId(null);
    setIsMuted(false);
    setError(null);
    setState(STATES.IDLE);
  }

  if (!ELEVENLABS_CONFIGURED) {
    return <NoElevenLabsBanner variant="full" />;
  }

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-6">
      <div className="bg-white border border-border rounded-2xl shadow-sm w-full max-w-md p-6 space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mx-auto mb-3">
            <Phone size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-semibold text-primary">AI Helpdesk</h1>
          <p className="text-sm text-secondary mt-1">
            {session?.user?.email}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 text-center">
            {error}
            <button onClick={resetCall} className="block mx-auto mt-2 text-xs text-red-600 underline">
              Retry
            </button>
          </div>
        )}

        {/* Post-call outcome card */}
        {postCall && !error && (
          <>
            {postCall.outcome === "resolved" && (
              <div className="rounded-xl p-4 text-center border bg-green-50 border-green-200">
                <p className="text-sm font-semibold text-green-800">✓ Your issue has been resolved.</p>
                {postCall.ticketNumber && (
                  <p className="text-xs text-green-700 mt-1">Reference number: {postCall.ticketNumber}</p>
                )}
                <p className="text-xs text-green-700 mt-0.5">No further action needed.</p>
              </div>
            )}
            {postCall.outcome === "escalated" && (
              <div className="rounded-xl p-4 text-center border bg-amber-50 border-amber-200">
                <p className="text-sm font-semibold text-amber-800">📋 A support ticket has been raised.</p>
                {postCall.ticketNumber && (
                  <p className="text-xs text-amber-700 mt-1">Reference number: {postCall.ticketNumber}</p>
                )}
                <p className="text-xs text-amber-700 mt-0.5">Our team will be in touch shortly.</p>
              </div>
            )}
            {(postCall.outcome === "abandoned" || (!postCall.outcome && !postCall.ticketId)) && (
              <div className="rounded-xl p-4 text-center border bg-gray-50 border-gray-200">
                <p className="text-sm font-semibold text-gray-700">The call has ended.</p>
                <p className="text-xs text-gray-500 mt-1">Please call back if you still need help.</p>
              </div>
            )}
          </>
        )}

        {/* State-dependent content */}
        <div className="flex flex-col items-center gap-4">

          {/* IDLE */}
          {state === STATES.IDLE && !error && (
            <button
              onClick={startCall}
              className="bg-accent text-white px-8 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors text-sm"
            >
              {postCall ? "Start New Call" : "Start Call"}
            </button>
          )}

          {/* CONNECTING */}
          {state === STATES.CONNECTING && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-secondary">Connecting…</p>
            </div>
          )}

          {/* ACTIVE */}
          {state === STATES.ACTIVE && (
            <>
              <Waveform />
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleMute}
                  title={isMuted ? "Unmute" : "Mute"}
                  className={`p-3 rounded-full border-2 transition-colors ${
                    isMuted
                      ? "border-red-500 text-red-500 bg-red-50"
                      : "border-accent text-accent bg-indigo-50"
                  }`}
                >
                  {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                <button
                  onClick={endCall}
                  title="End Call"
                  className="p-3 rounded-full border-2 border-red-500 text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
                >
                  <PhoneOff size={20} />
                </button>
              </div>
              {isMuted && (
                <p className="text-xs text-red-500 font-medium">Microphone muted</p>
              )}
            </>
          )}

          {/* ENDING */}
          {state === STATES.ENDING && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-secondary">Ending call…</p>
            </div>
          )}
        </div>

        {/* Live transcript */}
        {transcript.length > 0 && (
          <div className="border border-border rounded-xl p-3 max-h-56 overflow-y-auto space-y-2">
            {transcript.map((line, i) => (
              <div
                key={i}
                className={`flex gap-2 ${line.speaker === "agent" ? "" : "flex-row-reverse"}`}
              >
                <p
                  className={`text-sm max-w-[80%] px-3 py-1.5 rounded-xl ${
                    line.speaker === "agent"
                      ? "bg-sidebar text-primary"
                      : "bg-indigo-50 text-primary"
                  }`}
                >
                  {line.message}
                </p>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Sign out */}
        <div className="text-center">
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate("/helpdesk/login", { replace: true }); }}
            className="text-xs text-secondary hover:text-primary underline"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
