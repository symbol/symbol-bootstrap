/*
 * Copyright 2022 Fernando Boucquez
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { expect } from 'chai';
import 'mocha';
import { afterEach, describe, it } from 'mocha';
import { join } from 'path';
import { restore, stub } from 'sinon';
import { ConfigPreset, LoggerFactory, LogType, YamlUtils } from '../../src';
import { ConfigLoader, Preset, RemoteNodeService } from '../../src/service';
import { NodeWatchNodeInfo } from '../../src/service/NodeWatchService';

const logger = LoggerFactory.getLogger(LogType.Silent);

const mockNodeWatchNodes: NodeWatchNodeInfo[] = [
    {
        endpoint: 'https://nw-mock-01.example.invalid:3001',
        host: 'nw-mock-01.example.invalid',
        peerPort: 7900,
        isHealthy: true,
        publicKey: '1111111111111111111111111111111111111111111111111111111111111111',
        friendlyName: '!mock-nw-01',
        roles: 3,
    },
    {
        endpoint: 'https://nw-mock-02.example.invalid:3001',
        host: 'nw-mock-02.example.invalid',
        peerPort: 7900,
        isHealthy: true,
        publicKey: '2222222222222222222222222222222222222222222222222222222222222222',
        friendlyName: '!mock-nw-02',
        roles: 3,
    },
    {
        endpoint: 'https://nw-mock-03.example.invalid:3001',
        host: 'nw-mock-03.example.invalid',
        peerPort: 7900,
        isHealthy: true,
        publicKey: '3333333333333333333333333333333333333333333333333333333333333333',
        friendlyName: '!mock-nw-03',
        roles: 5,
    },
    {
        endpoint: 'http://nw-mock-04.example.invalid:3000',
        host: 'nw-mock-04.example.invalid',
        peerPort: 7900,
        isHealthy: false,
        publicKey: '4444444444444444444444444444444444444444444444444444444444444444',
        friendlyName: '!mock-nw-04',
        roles: 3,
    },
    {
        endpoint: 'https://nw-mock-05.example.invalid:3001',
        host: 'nw-mock-05.example.invalid',
        peerPort: 7900,
        isHealthy: true,
        publicKey: '5555555555555555555555555555555555555555555555555555555555555555',
        friendlyName: '!mock-nw-05',
        roles: 3,
    },
    {
        endpoint: 'http://nw-mock-06.example.invalid:3000',
        host: 'nw-mock-06.example.invalid',
        peerPort: 7900,
        isHealthy: true,
        publicKey: '6666666666666666666666666666666666666666666666666666666666666666',
        friendlyName: '!mock-nw-06',
        roles: 3,
    },
    {
        endpoint: '',
        host: 'nw-mock-peer-07.example.invalid',
        peerPort: 7900,
        isHealthy: null,
        publicKey: '7777777777777777777777777777777777777777777777777777777777777777',
        friendlyName: '!mock-nw-peer-07',
        roles: 5,
    },
    {
        endpoint: '',
        host: 'nw-mock-peer-08.example.invalid',
        peerPort: 7900,
        isHealthy: null,
        publicKey: '8888888888888888888888888888888888888888888888888888888888888888',
        friendlyName: '!mock-nw-peer-08',
        roles: 1,
    },
];

const customPresetObject = {
    lastKnownNetworkEpoch: 1,
    nodeUseRemoteAccount: true,
    nodes: [
        {
            mainPrivateKey: 'CA82E7ADAF7AB729A5462A1BD5AA78632390634904A64EB1BB22295E2E1A1BDD',
            friendlyName: 'myFriendlyName',
        },
    ],
    knownRestGateways: ['http://staticRest1:3000', 'https://staticRest2:3001'],
    knownPeers: [
        {
            publicKey: 'AAAAE7EAEEAE61EF0C50B4D05931F4325F69081B1B074D31E094C4B21E8CFB3D',
            endpoint: { host: 'someStaticPeer', port: 7900 },
            metadata: { name: 'someStaticPeer', roles: 'Peer,Api' },
        },
    ],
};

const preset = Preset.testnet;
const root = './';
const networkPresetLocation = `${root}/presets/${preset}/network.yml`;
const sharedPresetLocation = join(root, 'presets', 'shared.yml');
const sharedPreset = YamlUtils.loadYaml(sharedPresetLocation, false);
const networkPreset = YamlUtils.loadYaml(networkPresetLocation, false);
const presetData: ConfigPreset = new ConfigLoader(logger).mergePresets(sharedPreset, networkPreset, customPresetObject);

describe('RemoteNodeService', () => {
    afterEach(restore);

    it('getRestUrls known and healthy NodeWatch endpoints', async () => {
        stub(RemoteNodeService.prototype, 'getNodeWatchNodes').callsFake(async (baseUrl, type, limit) => {
            expect(baseUrl).eq(presetData.nodeWatchUrl);
            expect(type).eq('api');
            expect(limit).eq(presetData.nodeWatchRestLimit);
            return mockNodeWatchNodes;
        });

        const service = new RemoteNodeService(logger, presetData, false);
        const urls = await service.getRestUrls();

        expect(urls).to.deep.equal([
            'http://staticRest1:3000',
            'https://staticRest2:3001',
            'https://nw-mock-01.example.invalid:3001',
            'https://nw-mock-02.example.invalid:3001',
            'https://nw-mock-03.example.invalid:3001',
            'https://nw-mock-05.example.invalid:3001',
            'http://nw-mock-06.example.invalid:3000',
        ]);
    });

    it('getRestUrls offline skips NodeWatch', async () => {
        const service = new RemoteNodeService(logger, presetData, true);
        const urls = await service.getRestUrls();
        expect(urls).to.deep.equal(['http://staticRest1:3000', 'https://staticRest2:3001']);
    });

    it('getPeerInfos online merges NodeWatch peers after preset knownPeers', async () => {
        stub(RemoteNodeService.prototype, 'getNodeWatchNodes').callsFake(async (baseUrl, type, limit) => {
            expect(baseUrl).eq(presetData.nodeWatchUrl);
            expect(type).eq('peer');
            expect(limit).eq(presetData.nodeWatchPeerLimit);
            return mockNodeWatchNodes;
        });

        const service = new RemoteNodeService(logger, presetData, false);
        const peerInfos = await service.getPeerInfos();

        expect(peerInfos).to.deep.equal([
            {
                publicKey: 'AAAAE7EAEEAE61EF0C50B4D05931F4325F69081B1B074D31E094C4B21E8CFB3D',
                endpoint: { host: 'someStaticPeer', port: 7900 },
                metadata: { name: 'someStaticPeer', roles: 'Peer,Api' },
            },
            {
                publicKey: '1111111111111111111111111111111111111111111111111111111111111111',
                endpoint: { host: 'nw-mock-01.example.invalid', port: 7900 },
                metadata: { name: '!mock-nw-01', roles: 'Peer,Api' },
            },
            {
                publicKey: '2222222222222222222222222222222222222222222222222222222222222222',
                endpoint: { host: 'nw-mock-02.example.invalid', port: 7900 },
                metadata: { name: '!mock-nw-02', roles: 'Peer,Api' },
            },
            {
                publicKey: '3333333333333333333333333333333333333333333333333333333333333333',
                endpoint: { host: 'nw-mock-03.example.invalid', port: 7900 },
                metadata: { name: '!mock-nw-03', roles: 'Peer,Voting' },
            },
            {
                publicKey: '5555555555555555555555555555555555555555555555555555555555555555',
                endpoint: { host: 'nw-mock-05.example.invalid', port: 7900 },
                metadata: { name: '!mock-nw-05', roles: 'Peer,Api' },
            },
            {
                publicKey: '6666666666666666666666666666666666666666666666666666666666666666',
                endpoint: { host: 'nw-mock-06.example.invalid', port: 7900 },
                metadata: { name: '!mock-nw-06', roles: 'Peer,Api' },
            },
            {
                publicKey: '7777777777777777777777777777777777777777777777777777777777777777',
                endpoint: { host: 'nw-mock-peer-07.example.invalid', port: 7900 },
                metadata: { name: '!mock-nw-peer-07', roles: 'Peer,Voting' },
            },
            {
                publicKey: '8888888888888888888888888888888888888888888888888888888888888888',
                endpoint: { host: 'nw-mock-peer-08.example.invalid', port: 7900 },
                metadata: { name: '!mock-nw-peer-08', roles: 'Peer' },
            },
        ]);
    });

    it('getPeerInfos offline returns only preset knownPeers', async () => {
        const service = new RemoteNodeService(logger, presetData, true);
        const peerInfos = await service.getPeerInfos();
        expect(peerInfos).to.deep.equal([
            {
                publicKey: 'AAAAE7EAEEAE61EF0C50B4D05931F4325F69081B1B074D31E094C4B21E8CFB3D',
                endpoint: { host: 'someStaticPeer', port: 7900 },
                metadata: { name: 'someStaticPeer', roles: 'Peer,Api' },
            },
        ]);
    });

    it('getPeerInfos returns only preset knownPeers when NodeWatch fails', async () => {
        stub(RemoteNodeService.prototype, 'getNodeWatchNodes').rejects(new Error('node watch unavailable'));

        const service = new RemoteNodeService(logger, presetData, false);
        const peerInfos = await service.getPeerInfos();

        expect(peerInfos).to.deep.equal([
            {
                publicKey: 'AAAAE7EAEEAE61EF0C50B4D05931F4325F69081B1B074D31E094C4B21E8CFB3D',
                endpoint: { host: 'someStaticPeer', port: 7900 },
                metadata: { name: 'someStaticPeer', roles: 'Peer,Api' },
            },
        ]);
    });
});
