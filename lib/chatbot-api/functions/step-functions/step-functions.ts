import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';

// Import Lambda L2 construct
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as kendra from 'aws-cdk-lib/aws-kendra';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';

interface StepFunctionsStackProps {
    readonly knowledgeBase : kendra.CfnIndex;
    readonly evalSummariesTable : Table;
    readonly evalResutlsTable : Table;
    readonly evalTestCasesBucket : s3.Bucket;
}

export class StepFunctionsStack extends Construct {
    public readonly startLlmEvalStateMachineFunction: lambda.Function;
    public readonly splitEvalTestCasesFunction: lambda.Function;
    public readonly llmEvalResultsHandlerFunction: lambda.Function;
    public readonly generateResponseFunction: lambda.Function;
    public readonly llmEvalFunction: lambda.Function;
    public readonly aggregateEvalResultsFunction: lambda.Function;
    public readonly llmEvalCleanupFunction: lambda.Function;
    public readonly llmEvalStateMachine: StateMachine;

    constructor(scope: Construct, id: string, props: StepFunctionsStackProps) {
        super(scope, id);

        const splitEvalTestCasesFunction = new lambda.Function(this, 'SplitEvalTestCasesFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.join(__dirname, 'llm-evaluation/split-test-cases')), 
            handler: 'lambda_function.lambda_handler', 
            environment: {
                "TEST_CASES_BUCKET" : props.evalTestCasesBucket.bucketName
            },
            timeout: cdk.Duration.seconds(30)
        });
        splitEvalTestCasesFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:ListBucket',
                's3:PutObject'
            ],
            resources: [
                props.evalTestCasesBucket.bucketArn, 
                props.evalTestCasesBucket.bucketArn + "/*", 
                props.evalTestCasesBucket.arnForObjects('*'),
            ]
        }));
        this.splitEvalTestCasesFunction = splitEvalTestCasesFunction;

        const llmEvalResultsHandlerFunction = new lambda.Function(this, 'LlmEvalResultsHandlerFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.join(__dirname, 'llm-evaluation/results-to-ddb')), 
            handler: 'lambda_function.lambda_handler', 
            environment: {
                "EVAL_SUMMARIES_TABLE" : props.evalSummariesTable.tableName,
                "EVAL_RESULTS_TABLE" : props.evalResutlsTable.tableName,
                "TEST_CASES_BUCKET" : props.evalTestCasesBucket.bucketName,
            },
            timeout: cdk.Duration.seconds(30)
        });
        llmEvalResultsHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan'
            ],
            resources: [props.evalResutlsTable.tableArn, props.evalResutlsTable.tableArn + "/index/*", props.evalSummariesTable.tableArn, props.evalSummariesTable.tableArn + "/index/*"]
        }));
        llmEvalResultsHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:PutObject',
            ],
            resources: [
                props.evalTestCasesBucket.bucketArn, 
                props.evalTestCasesBucket.bucketArn + "/*", 
                props.evalTestCasesBucket.arnForObjects('*'),
            ]
        }));
        props.evalResutlsTable.grantReadWriteData(llmEvalResultsHandlerFunction);
        props.evalSummariesTable.grantReadWriteData(llmEvalResultsHandlerFunction);
        this.llmEvalResultsHandlerFunction = llmEvalResultsHandlerFunction; 

        const generateResponseFunction = new lambda.Function(this, 'GenerateResponseFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            code: lambda.Code.fromAsset(path.join(__dirname, 'llm-evaluation/generate-response')), 
            handler: 'index.handler', 
            environment : {
                "PROMPT" : "You are a considerate and helpful AI chatbot assistant for ALL MassHealth Enrollment Center workers. You are an expert on Masshealth policies, procedural information, MassHealth enrollment, and internal training materials. You are provided with relevant context below these instructions. It is very important that you only use information from the given context to answer the user's questions. DO NOT reference any information outside of the provided context, and ensure that your answers are solely based on the content within them. If the answer to the question is not contained within the excerpts, please respond with: 'I am sorry, I do not have enough information to answer your question.' If a user asks a non-MassHealth question quickly respond that you can only help with MassHealth related inquires. You will help call center workers respond to user complaints and queries about MassHealth enrollment and act as an integral resource for workers to refer and use when working on member cases. When you respond, your answers should be efficient and straight to the point, only respond directly to what the user asks and quickly direct them to all the resources and FACTUAL knowledge they need to know to answer their question. Respond to their question and structure your response clearly each time so the direct answer to their question stands out immediately. If they are asking for help with a process or an action that has multiple steps clearly number and list out each step they need to take with explanations. If a user tries to input any sensitive personal information about members, such as their SSN, it will be redacted from the message, so you can very quickly remind them not to input any PII but continue to respond to their question unless more information is needed after the message has been redacted.",
                'KB_ID' : props.knowledgeBase.attrId,
              },
            timeout: cdk.Duration.seconds(30)
        });
        generateResponseFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'bedrock:InvokeModelWithResponseStream',
              'bedrock:InvokeModel',

            ],
            resources: ["*"]
        }));
        generateResponseFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'kendra:Retrieve',
              'kendra:Query'
            ],
            resources: [props.knowledgeBase.attrArn]
        }));
        this.generateResponseFunction = generateResponseFunction;

        const llmEvalFunction = new lambda.DockerImageFunction(this, 'LlmEvaluationFunction', {
            code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, 'llm-evaluation/eval'), {
                platform: Platform.LINUX_AMD64, // Specify the correct platform
              }),
            environment: {
                "GENERATE_RESPONSE_LAMBDA_NAME" : generateResponseFunction.functionName,
                "BEDROCK_MODEL_ID" : "anthropic.claude-3-haiku-20240307-v1:0",
                "TEST_CASES_BUCKET" : props.evalTestCasesBucket.bucketName
            },
            timeout: cdk.Duration.minutes(15),
            memorySize: 10240
        });
        llmEvalFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'ecr:GetAuthorization',
              'ecr:GetDownloadUrlForLayer',
              'ecr:BatchGetImage',
              'ecr:BatchCheckLayerAvailability'
            ],
            resources: ['*']
        }));
        llmEvalFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'bedrock:InvokeModelWithResponseStream',
              'bedrock:InvokeModel'
            ],
            resources: ['*']
        }));
        llmEvalFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:PutObject',
            ],
            resources: [
                props.evalTestCasesBucket.bucketArn, 
                props.evalTestCasesBucket.bucketArn + "/*", 
                props.evalTestCasesBucket.arnForObjects('*'),
            ]
        }));
        generateResponseFunction.grantInvoke(llmEvalFunction);
        this.llmEvalFunction = llmEvalFunction;

        const aggregateEvalResultsFunction = new lambda.Function(this, 'AggregateEvalResultsFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.join(__dirname, 'llm-evaluation/aggregate-eval-results')), 
            handler: 'lambda_function.lambda_handler', 
            environment: {
                "TEST_CASES_BUCKET" : props.evalTestCasesBucket.bucketName,
            },
            timeout: cdk.Duration.seconds(30)
        });
        aggregateEvalResultsFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:PutObject',
            ],
            resources: [
                props.evalTestCasesBucket.bucketArn, 
                props.evalTestCasesBucket.bucketArn + "/*", 
                props.evalTestCasesBucket.arnForObjects('*'),
            ]
        }));
        this.aggregateEvalResultsFunction = aggregateEvalResultsFunction;

        const llmEvalCleanupFunction = new lambda.Function(this, 'LlmEvalCleanupFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.join(__dirname, 'llm-evaluation/cleanup')), 
            handler: 'lambda_function.lambda_handler', 
            environment: {
                "TEST_CASES_BUCKET" : props.evalTestCasesBucket.bucketName
            },
            timeout: cdk.Duration.seconds(30)
        });
        llmEvalCleanupFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:ListBucket',
                's3:DeleteObject',
                's3:DeleteObjects'
            ],
            resources: [
                props.evalTestCasesBucket.bucketArn, 
                props.evalTestCasesBucket.bucketArn + "/*", 
                props.evalTestCasesBucket.arnForObjects('*'),
            ]
        }));
        this.llmEvalCleanupFunction = llmEvalCleanupFunction;

        const splitTestCasesTask = new tasks.LambdaInvoke(this, 'Split Test Cases', {
            lambdaFunction: this.splitEvalTestCasesFunction,
            outputPath: '$.Payload',
          });

        // const evaluateTestCasesTask = new tasks.LambdaInvoke(this, 'Evaluate Test Cases', {
        // lambdaFunction: this.llmEvalFunction,
        // outputPath: '$.Payload',
        // });

        // const evaluateTestCasesTask = new tasks.LambdaInvoke(this, 'Evaluate Test Cases', {
        //     lambdaFunction: this.llmEvalFunction,
        //     payload: stepfunctions.TaskInput.fromObject({
        //         'chunk_key.$': '$',
        //     }),
        //     outputPath: '$.Payload',
        // });

        const evaluateTestCasesTask = new tasks.LambdaInvoke(this, 'Evaluate Test Cases', {
            lambdaFunction: this.llmEvalFunction,
            // payload: stepfunctions.TaskInput.fromObject({
            //     'chunk_key.$': '$',
            //     'evaluation_id.$': '$.evaluation_id',
            // }),
            outputPath: '$.Payload',
        });

        // const processTestCasesMap = new stepfunctions.Map(this, 'Process Test Cases', {
        // itemsPath: '$.chunks',
        // maxConcurrency: 5,
        // resultPath: '$.ProcessedResults'
        // });
        // processTestCasesMap.itemProcessor(evaluateTestCasesTask);

        const processTestCasesMap = new stepfunctions.Map(this, 'Process Test Cases', {
            itemsPath: '$.chunk_keys',
            maxConcurrency: 5,
            resultPath: '$.partial_result_keys',
            itemSelector: {
                'chunk_key.$': '$$.Map.Item.Value.chunk_key',
                'evaluation_id.$': '$$.Map.Item.Value.evaluation_id',
            },
        });
        processTestCasesMap.itemProcessor(evaluateTestCasesTask);

        const aggregateResultsTask = new tasks.LambdaInvoke(this, 'Aggregate Results', {
        lambdaFunction: this.aggregateEvalResultsFunction,
        payload: stepfunctions.TaskInput.fromObject({
            //'partial_results_list.$': '$.ProcessedResults',
            'partial_result_keys.$': '$.partial_result_keys',
            'evaluation_id.$': '$.evaluation_id',
            'evaluation_name.$': '$.evaluation_name',
            'test_cases_key.$': '$.test_cases_key',
        }),
        outputPath: '$.Payload',
        });

        const saveResultsTask = new tasks.LambdaInvoke(this, 'Save Evaluation Results', {
        lambdaFunction: this.llmEvalResultsHandlerFunction,
        payload: stepfunctions.TaskInput.fromObject({
            'evaluation_id.$': '$.evaluation_id',
            'evaluation_name.$': '$.evaluation_name',
            'average_similarity.$': '$.average_similarity',
            'average_relevance.$': '$.average_relevance',
            'average_correctness.$': '$.average_correctness',
            'total_questions.$': '$.total_questions',
            'detailed_results_s3_key.$': '$.detailed_results_s3_key',
            // 'detailed_results.$': '$.detailed_results',
            'test_cases_key.$': '$.test_cases_key',
        }),
        outputPath: '$.Payload',
        });

        const cleanupChunksTask = new tasks.LambdaInvoke(this, 'Cleanup Chunks', {
            lambdaFunction: this.llmEvalCleanupFunction,
            payload: stepfunctions.TaskInput.fromObject({
                'body.$': '$.body',
            }),
            outputPath: '$.Payload',
        });

        const definition = splitTestCasesTask
        .next(processTestCasesMap)
        .next(aggregateResultsTask)
        .next(saveResultsTask)
        .next(cleanupChunksTask);

        const llmEvalStateMachine = new stepfunctions.StateMachine(this, 'EvaluationStateMachine', {
            definitionBody: stepfunctions.DefinitionBody.fromChainable(definition),
            timeout: cdk.Duration.hours(1),
        });
        this.llmEvalStateMachine = llmEvalStateMachine;

        const startLlmEvalStateMachineFunction = new lambda.Function(this, 'StartLlmEvalStateMachineFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            code: lambda.Code.fromAsset(path.join(__dirname, 'llm-evaluation/start-llm-eval')), 
            handler: 'index.handler', 
            environment: {
                "STATE_MACHINE_ARN" : this.llmEvalStateMachine.stateMachineArn
            },
            timeout: cdk.Duration.seconds(30)
        });
        startLlmEvalStateMachineFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['states:StartExecution'],
            resources: [this.llmEvalStateMachine.stateMachineArn], 
        }));
        this.startLlmEvalStateMachineFunction = startLlmEvalStateMachineFunction;
    }
}