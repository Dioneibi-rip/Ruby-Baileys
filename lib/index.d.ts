import { proto } from '../WAProto';
import makeWASocket, { makeWASocketWithTelemetry, prepareWASocketConfig } from './Socket';

export * from '../WAProto';
export * from './Utils';
export * from './Types';
export * from './Store';
export * from './Defaults';
export * from './WABinary';
export * from './WAM';
export * from './WAUSync';

export type WASocket = Awaited<ReturnType<typeof makeWASocket>>;

export { makeWASocket, makeWASocketWithTelemetry, prepareWASocketConfig, proto };
export default makeWASocket;