import { PhoneOff } from "lucide-react";

/**
 * variant="full"  — centered card used on the customer CallPage
 * variant="inline" — small inline text used in admin CallMonitor
 */
export default function NoElevenLabsBanner({ variant = "full" }) {
  if (variant === "inline") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
        <PhoneOff size={12} />
        ElevenLabs voice agent not configured — live calls unavailable
      </p>
    );
  }

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-6">
      <div className="bg-white border border-border rounded-2xl shadow-sm w-full max-w-md p-8 space-y-5 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto">
          <PhoneOff size={26} className="text-amber-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-primary">Voice Agent Unavailable</h2>
          <p className="text-sm text-secondary leading-relaxed">
            The ElevenLabs voice agent is not connected in this environment.
            The <code className="text-xs bg-sidebar px-1 py-0.5 rounded font-mono">VITE_ELEVENLABS_AGENT_ID</code> configuration
            is missing or has not been set up.
          </p>
        </div>
        <div className="bg-sidebar rounded-xl p-4 text-left space-y-2">
          <p className="text-xs font-semibold text-primary">To enable voice calls:</p>
          <ol className="text-xs text-secondary space-y-1 list-decimal list-inside">
            <li>Configure your ElevenLabs agent in the ElevenLabs dashboard</li>
            <li>
              Add <code className="font-mono bg-white px-1 rounded border border-border">VITE_ELEVENLABS_AGENT_ID=&lt;your-agent-id&gt;</code> to your <code className="font-mono bg-white px-1 rounded border border-border">.env</code> file
            </li>
            <li>Restart the development server</li>
          </ol>
        </div>
        <p className="text-xs text-secondary">
          Please contact your system administrator if you need access.
        </p>
      </div>
    </div>
  );
}
