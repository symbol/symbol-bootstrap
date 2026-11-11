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

// Node 22.6+ (and 23.6+/24 by default) can strip TypeScript types natively. When that is on, mocha loads the
// .ts test files via import() instead of require(), which breaks @oclif/test 1.x (it reads module.parent at load
// time). Disable native type stripping so ts-node keeps handling the test files. Older Node versions do not know
// the flag and would reject it, so it is only passed where it exists.
const nodeMajor = Number(process.versions.node.split('.')[0]);

module.exports = {
    'node-option': nodeMajor >= 22 ? ['no-experimental-strip-types'] : [],
};
