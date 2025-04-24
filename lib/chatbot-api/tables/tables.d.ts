import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
export declare class TableStack extends Stack {
    readonly historyTable: Table;
    readonly feedbackTable: Table;
    constructor(scope: Construct, id: string, props?: StackProps);
}
