import { useState } from 'react'
import { Brain, Zap, Database, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react'

const SF_TARGET_SCHEMA = {
  Account: {
    label: 'Account',
    fields: [
      { name: 'Id', type: 'ID', required: true, description: 'Unique Salesforce record identifier' },
      { name: 'Name', type: 'String(255)', required: true, description: 'Company / organization name' },
      { name: 'BillingCountry', type: 'String(80)', required: false, description: 'ISO country code or full name' },
      { name: 'Phone', type: 'Phone', required: false, description: 'Primary phone number' },
      { name: 'Industry', type: 'Picklist', required: false, description: 'Industry classification' },
      { name: 'Website', type: 'URL', required: false, description: 'Company website URL' },
    ],
  },
  Contact: {
    label: 'Contact',
    fields: [
      { name: 'Id', type: 'ID', required: true, description: 'Unique Salesforce record identifier' },
      { name: 'AccountId', type: 'Reference(Account)', required: true, description: 'FK to parent Account' },
      { name: 'FirstName', type: 'String(40)', required: false, description: 'Contact first name' },
      { name: 'LastName', type: 'String(80)', required: true, description: 'Contact last name' },
      { name: 'Email', type: 'Email', required: false, description: 'Email address' },
      { name: 'Phone', type: 'Phone', required: false, description: 'Phone number' },
      { name: 'Title', type: 'String(128)', required: false, description: 'Job title' },
    ],
  },
  Lead: {
    label: 'Lead',
    fields: [
      { name: 'Id', type: 'ID', required: true, description: 'Unique Salesforce record identifier' },
      { name: 'FirstName', type: 'String(40)', required: false, description: 'Lead first name' },
      { name: 'LastName', type: 'String(80)', required: true, description: 'Lead last name' },
      { name: 'Company', type: 'String(255)', required: true, description: 'Company name' },
      { name: 'Email', type: 'Email', required: false, description: 'Email address' },
      { name: 'Phone', type: 'Phone', required: false, description: 'Phone number' },
      { name: 'Status', type: 'Picklist', required: true, description: 'Lead status (e.g. Open, Contacted)' },
      { name: 'LeadSource', type: 'Picklist', required: false, description: 'Source of the lead' },
    ],
  },
  Opportunity: {
    label: 'Opportunity',
    fields: [
      { name: 'Id', type: 'ID', required: true, description: 'Unique Salesforce record identifier' },
      { name: 'AccountId', type: 'Reference(Account)', required: true, description: 'FK to parent Account' },
      { name: 'Name', type: 'String(120)', required: true, description: 'Opportunity name' },
      { name: 'Amount', type: 'Currency', required: false, description: 'Deal amount in USD' },
      { name: 'StageName', type: 'Picklist', required: true, description: 'Sales stage (e.g. Prospecting, Closed Won)' },
      { name: 'CloseDate', type: 'Date', required: true, description: 'Expected close date (YYYY-MM-DD)' },
      { name: 'ContactId', type: 'Reference(Contact)', required: false, description: 'FK to primary Contact' },
      { name: 'Probability', type: 'Percent', required: false, description: 'Win probability (0-100)' },
    ],
  },
}

export default function MappingView({ mappingData, onGenerateMapping }) {
  const [schemaOpen, setSchemaOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-secondary">AI infers field mappings from legacy columns to Salesforce schema.</p>
        <button onClick={onGenerateMapping} className="btn-primary flex items-center gap-2">
          <Zap className="w-4 h-4" /> Generate Mapping
        </button>
      </div>

      <div className="card">
        <button onClick={() => setSchemaOpen(!schemaOpen)} className="w-full flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
            <Database className="w-4 h-4 text-accent" /> Target Salesforce Schema
          </h3>
          {schemaOpen ? <ChevronUp className="w-4 h-4 text-secondary" /> : <ChevronDown className="w-4 h-4 text-secondary" />}
        </button>
        {schemaOpen && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            {Object.entries(SF_TARGET_SCHEMA).map(([key, obj]) => (
              <div key={key} className="border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-[rgba(90,106,207,0.08)] border-b border-[rgba(90,106,207,0.15)]">
                  <p className="text-xs font-semibold text-accent">SF: {obj.label}</p>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-xs text-secondary uppercase border-b border-border bg-sidebar">
                      <th className="px-3 py-1.5 text-left">Field</th>
                      <th className="px-3 py-1.5 text-left">Type</th>
                      <th className="px-3 py-1.5 text-center">Req</th>
                      <th className="px-3 py-1.5 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {obj.fields.map(f => (
                      <tr key={f.name} className="border-b border-border last:border-0">
                        <td className="px-3 py-1.5">
                          <code className="text-xs bg-[rgba(90,106,207,0.1)] text-accent px-1.5 py-0.5 rounded font-mono">{f.name}</code>
                        </td>
                        <td className="px-3 py-1.5 text-xs text-secondary font-mono">{f.type}</td>
                        <td className="px-3 py-1.5 text-center">
                          {f.required
                            ? <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-semibold">Yes</span>
                            : <span className="text-xs text-border">—</span>}
                        </td>
                        <td className="px-3 py-1.5 text-xs text-secondary">{f.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 bg-[rgba(90,106,207,0.07)] border border-[rgba(90,106,207,0.15)] rounded-lg p-4">
        <Brain className="w-4 h-4 text-accent mt-0.5 shrink-0" />
        <div className="text-sm text-primary space-y-1">
          <p className="font-semibold text-primary">AI Agent Role (Strictly Limited)</p>
          <ul className="text-xs space-y-0.5 text-secondary">
            <li>1. Infer field mappings from legacy → Salesforce schema</li>
            <li>2. Suggest normalization transforms per field</li>
            <li>3. Flag confidence levels per mapping</li>
          </ul>
          <p className="text-xs text-secondary mt-2">LLM sees max 20 sample rows. Called once per upload. Cached by schema hash.</p>
        </div>
      </div>

      {mappingData && (
        <div className="space-y-5 animate-fade-in">
          <div className="card">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-primary">Mapping Overview</h3>
              <div className="flex items-center gap-2">
                <ConfidencePill confidence={mappingData.mapping_spec?.confidence} />
                {mappingData.cached && <span className="badge-blue">Cached</span>}
              </div>
            </div>
          </div>

          {mappingData.mapping_spec?.object_mappings &&
            Object.entries(mappingData.mapping_spec.object_mappings).map(([objName, objData]) => (
              <div key={objName} className="card-flush">
                <div className="px-5 py-3 bg-sidebar border-b border-border flex items-center gap-2">
                  <Database className="w-4 h-4 text-accent" />
                  <h3 className="text-sm font-semibold text-primary">Salesforce: {objName}</h3>
                  <span className="badge-gray text-xs">{objData.fields?.length || 0} fields</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                    <thead>
                      <tr className="text-left text-xs text-secondary uppercase border-b border-border bg-sidebar">
                        <th className="px-5 py-2">Source Field</th>
                        <th className="py-2"></th>
                        <th className="px-5 py-2">Target Field</th>
                        <th className="px-5 py-2">Transform</th>
                        <th className="px-5 py-2">Confidence</th>
                        <th className="px-5 py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {objData.fields?.map((field, idx) => (
                        <tr key={idx} className="border-b border-border hover:bg-sidebar transition-colors">
                          <td className="px-5 py-2.5">
                            <code className="text-xs bg-sidebar text-primary px-2 py-0.5 rounded font-mono border border-border">{field.source_field}</code>
                          </td>
                          <td className="py-2.5 text-center"><ArrowRight className="w-3 h-3 text-border" /></td>
                          <td className="px-5 py-2.5">
                            <code className="text-xs bg-[rgba(90,106,207,0.1)] text-accent px-2 py-0.5 rounded font-mono">{field.target_field}</code>
                          </td>
                          <td className="px-5 py-2.5">
                            {field.transform && <span className="badge-purple text-xs">{field.transform}</span>}
                          </td>
                          <td className="px-5 py-2.5"><ConfidencePill confidence={field.confidence} /></td>
                          <td className="px-5 py-2.5 text-xs text-secondary truncate">{field.notes || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

          {mappingData.mapping_spec?.transforms?.length > 0 && (
            <div className="card">
              <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> Planned Transforms
              </h3>
              <div className="flex flex-wrap gap-2">
                {mappingData.mapping_spec.transforms.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-sidebar border border-border rounded-lg px-3 py-2 text-xs">
                    <span className="badge-purple text-xs">{t.transform}</span>
                    <span className="text-secondary">on</span>
                    <code className="font-mono text-xs bg-white text-primary px-1.5 py-0.5 rounded border border-border">{t.source_field}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ConfidencePill({ confidence }) {
  if (!confidence && confidence !== 0) return null
  const pct = Math.round(confidence * 100)
  const cls = pct >= 85 ? 'badge-green' : pct >= 60 ? 'badge-amber' : 'badge-red'
  return <span className={`${cls} text-xs`}>{pct}%</span>
}
