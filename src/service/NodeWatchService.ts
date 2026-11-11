import fetch from 'cross-fetch';

export interface NodeWatchNodeInfo {
    endpoint: string;
    host: string;
    peerPort: number;
    isHealthy: boolean | null;
    publicKey: string;
    friendlyName: string;
    roles: number;
}

export class NodeWatchService {
    private static readonly PEER_PORT = 7900;

    constructor(private readonly baseUrl: string) {}

    public static mapResponse(response: any): NodeWatchNodeInfo {
        return {
            endpoint: response.endpoint,
            host: NodeWatchService.hostPortFromEndpoint(response.endpoint),
            peerPort: NodeWatchService.PEER_PORT,
            isHealthy: response.isHealthy,
            publicKey: response.mainPublicKey,
            friendlyName: response.name,
            roles: response.roles,
        };
    }

    private static hostPortFromEndpoint(endpoint: string | null | undefined): string {
        if (!endpoint) {
            return '';
        }
        try {
            return new URL(endpoint).hostname;
        } catch {
            return '';
        }
    }

    public async fetchNodesByType(nodeType: 'api' | 'peer', limit: number): Promise<NodeWatchNodeInfo[]> {
        const params = new URLSearchParams({
            only_ssl: nodeType === 'api' ? 'true' : 'false',
            limit: `${limit}`,
            order: 'random',
        });
        const url = `${this.baseUrl}/api/symbol/nodes/peer?${params.toString()}`;
        const body = await this.requestJson(url);
        if (!Array.isArray(body)) {
            throw new Error('Node watch response was not a JSON array');
        }
        return body.map((node: any) => NodeWatchService.mapResponse(node));
    }

    private async requestJson(url: string): Promise<any> {
        const response = await fetch(url, {});
        if (!response.ok) {
            const reason = response.statusText ? `${response.status} ${response.statusText}` : `${response.status}`;
            throw new Error(`Node watch request failed: HTTP ${reason}`);
        }
        return await response.json();
    }
}
