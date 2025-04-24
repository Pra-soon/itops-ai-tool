import * as cdk from 'aws-cdk-lib';
import * as kendra from 'aws-cdk-lib/aws-kendra';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from "constructs";
export interface KendraIndexStackProps {
    s3Bucket: s3.Bucket;
}
export declare class KendraIndexStack extends cdk.Stack {
    readonly kendraIndex: kendra.CfnIndex;
    readonly kendraSource: kendra.CfnDataSource;
    constructor(scope: Construct, id: string, props: KendraIndexStackProps);
}
