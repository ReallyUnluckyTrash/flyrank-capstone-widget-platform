CREATE TABLE tenants (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    company_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE widgets (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'signup',
    title TEXT NOT NULL,
    description TEXT,
    form_fields JSONB NOT NULL,
    button_text TEXT NOT NULL DEFAULT 'Sign up',
    display_options JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT widgets_type_check CHECK (type = 'signup')
);

CREATE INDEX idx_widgets_tenant_id
    ON widgets(tenant_id);

CREATE TABLE submissions (
    id UUID PRIMARY KEY,
    widget_id UUID NOT NULL REFERENCES widgets(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    ip_address INET,
    country TEXT,
    city TEXT,
    is_spam BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_submissions_tenant_id
    ON submissions(tenant_id);

CREATE INDEX idx_submissions_widget_id
    ON submissions(widget_id);