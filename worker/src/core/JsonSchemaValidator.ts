import { Ajv } from 'ajv';
import formatsPluginModule from 'ajv-formats';

export function createJsonSchemaValidator(): Ajv {
    const ajv = new Ajv();
    formatsPluginModule.default(ajv);
    return ajv;
}
