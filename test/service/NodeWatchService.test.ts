import { expect } from 'chai';
import 'mocha';
import { afterEach, describe, it } from 'mocha';
import { NodeWatchService } from '../../src/service/NodeWatchService';
import nock = require('nock');

const baseUrl = 'https://nodewatch.test';

describe('NodeWatchService', () => {
    afterEach(() => {
        nock.cleanAll();
    });

    describe('mapResponse', () => {
        it('maps flat NodeWatch JSON row', () => {
            const mapped = NodeWatchService.mapResponse({
                endpoint: 'https://example.com:3001',
                name: 'Node1',
                mainPublicKey: 'MAINPUBLICKEYHEX0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF',
                nodePublicKey: 'NODEPUBLICKEYHEX0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF',
                isSslEnabled: true,
                isHealthy: true,
                restVersion: '1.0.0',
                roles: 3,
            });

            expect(mapped).to.deep.equal({
                endpoint: 'https://example.com:3001',
                host: 'example.com',
                peerPort: 7900,
                isHealthy: true,
                publicKey: 'MAINPUBLICKEYHEX0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF',
                friendlyName: 'Node1',
                roles: 3,
            });
        });

        it('propagates isHealthy null from API', () => {
            const mapped = NodeWatchService.mapResponse({
                endpoint: '',
                name: 'peer-only',
                mainPublicKey: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
                isHealthy: null,
                roles: 1,
            });
            expect(mapped.isHealthy).eq(null);
            expect(mapped.host).eq('');
        });

        it('returns empty host when endpoint is not a valid URL', () => {
            const mapped = NodeWatchService.mapResponse({
                endpoint: 'not-a-valid-url',
                name: 'x',
                mainPublicKey: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
                isHealthy: false,
                roles: 1,
            });
            expect(mapped.host).eq('');
        });
    });

    describe('fetchNodesByType', () => {
        it('calls /nodes/peer with only_ssl=true for nodeType api and maps array body', async () => {
            const row = {
                endpoint: 'https://dual.example:3001',
                name: 'dual',
                mainPublicKey: 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
                isHealthy: true,
                roles: 3,
            };
            nock(baseUrl).get('/api/symbol/nodes/peer').query({ only_ssl: 'true', limit: '5', order: 'random' }).reply(200, [row]);

            const service = new NodeWatchService(baseUrl);
            const nodes = await service.fetchNodesByType('api', 5);

            expect(nodes).to.have.lengthOf(1);
            expect(nodes[0].friendlyName).eq('dual');
            expect(nodes[0].host).eq('dual.example');
            expect(nock.isDone()).eq(true);
        });

        it('calls /nodes/peer with only_ssl=false for nodeType peer', async () => {
            nock(baseUrl).get('/api/symbol/nodes/peer').query({ only_ssl: 'false', limit: '1', order: 'random' }).reply(200, []);

            const service = new NodeWatchService(baseUrl);
            await service.fetchNodesByType('peer', 1);
            expect(nock.isDone()).eq(true);
        });

        it('throws when response body is not a JSON array', async () => {
            nock(baseUrl).get('/api/symbol/nodes/peer').query(true).reply(200, { ok: false });

            const service = new NodeWatchService(baseUrl);
            try {
                await service.fetchNodesByType('api', 1);
                expect.fail('expected error');
            } catch (e: unknown) {
                expect((e as Error).message).eq('Node watch response was not a JSON array');
            }
        });

        it('throws when HTTP status is not 2xx', async () => {
            nock(baseUrl).get('/api/symbol/nodes/peer').query(true).reply(503);

            const service = new NodeWatchService(baseUrl);
            try {
                await service.fetchNodesByType('peer', 2);
                expect.fail('expected error');
            } catch (e: unknown) {
                expect((e as Error).message).eq('Node watch request failed: HTTP 503 Service Unavailable');
            }
        });
    });
});
