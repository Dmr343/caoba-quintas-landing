-- Índice para que la limpieza por retención de wa_inbound (DELETE por
-- received_at) sea eficiente. La purga la hace el Worker de forma oportunista.
CREATE INDEX IF NOT EXISTS idx_wa_inbound_received ON wa_inbound(received_at);
