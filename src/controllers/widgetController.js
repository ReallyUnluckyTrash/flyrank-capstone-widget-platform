import {
    createWidget,
    deleteWidget,
    getWidgetById,
    getWidgets,
    updateWidget,
} from '../services/widgetService.js';

const widgetFields = [
    'title',
    'description',
    'form_fields',
    'button_text',
    'display_options',
];

function getTenantId(request) {
    return request.user.id;
}

function getEmbedSnippet(widgetId) {
    const baseUrl = process.env.PUBLIC_APP_URL || 'http://localhost:3000';
    return `<script src="${baseUrl}/widget.js?id=${widgetId}" defer></script>`;
}

function getCreateInput(body = {}) {
    return widgetFields.reduce((input, field) => {
        if (body[field] !== undefined) {
            input[field] = body[field];
        }
        return input;
    }, {});
}

function getUpdateInput(body = {}) {
    return getCreateInput(body);
}

export const widgetController = {
    async createWidget(req, res) {
        const input = getCreateInput(req.body);
        if (!input.title || input.form_fields === undefined) {
            return res.status(400).send({ error: 'Title and form_fields are required' });
        }

        const widget = await createWidget(getTenantId(req), input);
        return res.status(201).send({
            data: widget,
            embed_snippet: getEmbedSnippet(widget.id),
        });
    },

    async getWidgets(req, res) {
        const widgets = await getWidgets(getTenantId(req));
        return res.status(200).send({ data: widgets });
    },

    async getWidgetById(req, res) {
        const widget = await getWidgetById(req.params.id, getTenantId(req));
        if (!widget) {
            return res.status(404).send({ error: 'Widget not found' });
        }
        return res.status(200).send({ data: widget });
    },

    async updateWidget(req, res) {
        const widget = await updateWidget(
            req.params.id,
            getTenantId(req),
            getUpdateInput(req.body),
        );
        if (!widget) {
            return res.status(404).send({ error: 'Widget not found' });
        }
        return res.status(200).send({ data: widget });
    },

    async deleteWidget(req, res) {
        const deleted = await deleteWidget(req.params.id, getTenantId(req));
        if (!deleted) {
            return res.status(404).send({ error: 'Widget not found' });
        }
        return res.status(204).send();
    },
};