const TABLES = [
  {
    id: 'outbound_analysis',
    label: 'Análisis Outbound',
    fullName: 'atom-ai-labs-ad1fa.conversational_ai_lab.outbound_analysis',
    dateColumn: 'date',
    companyColumn: 'company_name'
  },
  {
    id: 'first_30_messages_last_30_days',
    label: 'Análisis Conversaciones Inbound',
    fullName: 'atom-ai-labs-ad1fa.conversational_ai_lab.first_30_messages_last_30_days',
    dateColumn: 'created_at',
    companyColumn: 'company_name'
  }
];

module.exports = TABLES;
