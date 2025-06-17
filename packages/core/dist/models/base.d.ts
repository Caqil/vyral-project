import { Document } from 'mongoose';
import { BaseEntity } from '../types/core';
export interface BaseDocument extends Document, BaseEntity {
    _id: string;
}
export declare const baseSchemaOptions: {
    timestamps: boolean;
    toJSON: {
        virtuals: boolean;
        transform: (doc: any, ret: any) => any;
    };
    toObject: {
        virtuals: boolean;
        transform: (doc: any, ret: any) => any;
    };
};
export declare const createBaseSchema: (definition: any) => any;
//# sourceMappingURL=base.d.ts.map