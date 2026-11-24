import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { EventEmitter } from 'node:events';
import {
	broadcastToTenant,
	openTenantStream,
} from '../src/services/sseService.js';

const activeRequests = [];

function createStream(tenantId) {
	const request = new EventEmitter();
	const response = Object.assign(new EventEmitter(), {
		writableEnded: false,
		destroyed: false,
		status: jest.fn().mockReturnThis(),
		set: jest.fn().mockReturnThis(),
		flushHeaders: jest.fn(),
		write: jest.fn(),
	});

	activeRequests.push(request);
	openTenantStream(tenantId, request, response);
	return { request, response };
}

afterEach(() => {
	for (const request of activeRequests) {
		request.emit('close');
	}
	activeRequests.length = 0;
	jest.useRealTimers();
});

describe('openTenantStream', () => {
	test('sets SSE headers and sends the initial connection event', () => {
		const { response } = createStream('tenant-1');

		expect(response.status).toHaveBeenCalledWith(200);
		expect(response.set).toHaveBeenCalledWith({
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'Content-Type': 'text/event-stream',
			'X-Accel-Buffering': 'no',
		});
		expect(response.flushHeaders).toHaveBeenCalledTimes(1);
		expect(response.write).toHaveBeenCalledWith(
			'event: connected\ndata: {"connected":true}\n\n',
		);
	});

	test('sends heartbeats while connected and stops after the client closes', () => {
		jest.useFakeTimers();
		const { request, response } = createStream('tenant-1');

		jest.advanceTimersByTime(30000);
		expect(response.write).toHaveBeenCalledTimes(2);
		expect(response.write).toHaveBeenLastCalledWith(': heartbeat\n\n');

		request.emit('close');
		jest.advanceTimersByTime(60000);
		expect(response.write).toHaveBeenCalledTimes(2);
	});
});

describe('broadcastToTenant', () => {
	test('delivers an event only to connected clients for the target tenant', () => {
		const tenantStream = createStream('tenant-1');
		const otherTenantStream = createStream('tenant-2');

		broadcastToTenant('tenant-1', 'submission.created', { id: 'submission-1' });

		expect(tenantStream.response.write).toHaveBeenLastCalledWith(
			'event: submission.created\ndata: {"id":"submission-1"}\n\n',
		);
		expect(otherTenantStream.response.write).toHaveBeenCalledTimes(1);
	});

	test.each(['writableEnded', 'destroyed'])('removes a response when %s is true', (state) => {
		const { response } = createStream('tenant-1');
		response[state] = true;

		broadcastToTenant('tenant-1', 'submission.created', { id: 'submission-1' });
		response[state] = false;
		broadcastToTenant('tenant-1', 'submission.created', { id: 'submission-2' });

		expect(response.write).toHaveBeenCalledTimes(1);
	});

	test('removes a response when writing to it throws', () => {
		const { response } = createStream('tenant-1');
		response.write.mockImplementationOnce(() => {
			throw new Error('client disconnected');
		});

		broadcastToTenant('tenant-1', 'submission.created', { id: 'submission-1' });
		broadcastToTenant('tenant-1', 'submission.created', { id: 'submission-2' });

		expect(response.write).toHaveBeenCalledTimes(2);
	});
});
