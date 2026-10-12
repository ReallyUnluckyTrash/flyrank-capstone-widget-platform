const connectionsByTenant = new Map();

function removeConnection(tenantId, response) {
	const connections = connectionsByTenant.get(tenantId);
	if (!connections) return;

	connections.delete(response);
	if (connections.size === 0) connectionsByTenant.delete(tenantId);
}

export function openTenantStream(tenantId, request, response) {
	response.status(200);
	response.set({
		'Cache-Control': 'no-cache',
		Connection: 'keep-alive',
		'Content-Type': 'text/event-stream',
		'X-Accel-Buffering': 'no',
	});
	response.flushHeaders();

	if (!connectionsByTenant.has(tenantId)) {
		connectionsByTenant.set(tenantId, new Set());
	}
	connectionsByTenant.get(tenantId).add(response);

	const cleanup = () => {
		clearInterval(heartbeat);
		removeConnection(tenantId, response);
	};
	const heartbeat = setInterval(() => {
		if (!response.writableEnded) response.write(': heartbeat\n\n');
	}, 30000);

	request.on('close', cleanup);
	response.on('close', cleanup);
	response.write('event: connected\ndata: {"connected":true}\n\n');
}

export function broadcastToTenant(tenantId, event, payload) {
	const connections = connectionsByTenant.get(tenantId);
	if (!connections) return;

	const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
	for (const response of connections) {
		if (response.writableEnded || response.destroyed) {
			removeConnection(tenantId, response);
			continue;
		}

		try {
			response.write(message);
		} catch {
			removeConnection(tenantId, response);
		}
	}
}