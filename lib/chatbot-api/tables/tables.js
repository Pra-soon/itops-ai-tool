"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_dynamodb_1 = require("aws-cdk-lib/aws-dynamodb");
class TableStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Define the table
        const chatHistoryTable = new aws_dynamodb_1.Table(scope, 'ChatHistoryTable', {
            partitionKey: { name: 'user_id', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'session_id', type: aws_dynamodb_1.AttributeType.STRING },
        });
        // Add a global secondary index to sort ChatHistoryTable by time_stamp
        chatHistoryTable.addGlobalSecondaryIndex({
            indexName: 'TimeIndex',
            partitionKey: { name: 'user_id', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'time_stamp', type: aws_dynamodb_1.AttributeType.STRING },
            projectionType: aws_dynamodb_1.ProjectionType.ALL,
        });
        this.historyTable = chatHistoryTable;
        // Define the second table (UserFeedbackTable)
        const userFeedbackTable = new aws_dynamodb_1.Table(scope, 'UserFeedbackTable', {
            partitionKey: { name: 'Topic', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'CreatedAt', type: aws_dynamodb_1.AttributeType.STRING },
        });
        // Add a global secondary index to UserFeedbackTable with partition key CreatedAt
        userFeedbackTable.addGlobalSecondaryIndex({
            indexName: 'CreatedAtIndex',
            partitionKey: { name: 'CreatedAt', type: aws_dynamodb_1.AttributeType.STRING },
            projectionType: aws_dynamodb_1.ProjectionType.ALL,
        });
        userFeedbackTable.addGlobalSecondaryIndex({
            indexName: 'AnyIndex',
            partitionKey: { name: 'Any', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'CreatedAt', type: aws_dynamodb_1.AttributeType.STRING },
            projectionType: aws_dynamodb_1.ProjectionType.ALL,
        });
        this.feedbackTable = userFeedbackTable;
    }
}
exports.TableStack = TableStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFibGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGFibGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUFnRDtBQUVoRCwyREFBMkY7QUFFM0YsTUFBYSxVQUFXLFNBQVEsbUJBQUs7SUFHbkMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFrQjtRQUMxRCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixtQkFBbUI7UUFDbkIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLG9CQUFLLENBQUMsS0FBSyxFQUFFLGtCQUFrQixFQUFFO1lBQzVELFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTSxFQUFFO1lBQzdELE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTSxFQUFFO1NBQzVELENBQUMsQ0FBQztRQUVILHNFQUFzRTtRQUN0RSxnQkFBZ0IsQ0FBQyx1QkFBdUIsQ0FBQztZQUN2QyxTQUFTLEVBQUUsV0FBVztZQUN0QixZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU0sRUFBRTtZQUM3RCxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU0sRUFBRTtZQUMzRCxjQUFjLEVBQUUsNkJBQWMsQ0FBQyxHQUFHO1NBQ25DLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxZQUFZLEdBQUcsZ0JBQWdCLENBQUM7UUFFckMsOENBQThDO1FBQzlDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxvQkFBSyxDQUFDLEtBQUssRUFBRSxtQkFBbUIsRUFBRTtZQUM5RCxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU0sRUFBRTtZQUMzRCxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU0sRUFBRTtTQUMzRCxDQUFDLENBQUM7UUFFSCxpRkFBaUY7UUFDakYsaUJBQWlCLENBQUMsdUJBQXVCLENBQUM7WUFDeEMsU0FBUyxFQUFFLGdCQUFnQjtZQUMzQixZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU0sRUFBRTtZQUMvRCxjQUFjLEVBQUUsNkJBQWMsQ0FBQyxHQUFHO1NBQ25DLENBQUMsQ0FBQztRQUVILGlCQUFpQixDQUFDLHVCQUF1QixDQUFDO1lBQ3hDLFNBQVMsRUFBRSxVQUFVO1lBQ3JCLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTSxFQUFFO1lBQ3pELE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTSxFQUFFO1lBQzFELGNBQWMsRUFBRSw2QkFBYyxDQUFDLEdBQUc7U0FDbkMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGFBQWEsR0FBRyxpQkFBaUIsQ0FBQztJQUN6QyxDQUFDO0NBQ0Y7QUE1Q0QsZ0NBNENDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU3RhY2ssIFN0YWNrUHJvcHMgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IEF0dHJpYnV0ZSwgQXR0cmlidXRlVHlwZSwgVGFibGUsIFByb2plY3Rpb25UeXBlIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcblxuZXhwb3J0IGNsYXNzIFRhYmxlU3RhY2sgZXh0ZW5kcyBTdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBoaXN0b3J5VGFibGUgOiBUYWJsZTtcbiAgcHVibGljIHJlYWRvbmx5IGZlZWRiYWNrVGFibGUgOiBUYWJsZTtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBEZWZpbmUgdGhlIHRhYmxlXG4gICAgY29uc3QgY2hhdEhpc3RvcnlUYWJsZSA9IG5ldyBUYWJsZShzY29wZSwgJ0NoYXRIaXN0b3J5VGFibGUnLCB7XG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJfaWQnLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogeyBuYW1lOiAnc2Vzc2lvbl9pZCcsIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgfSk7XG5cbiAgICAvLyBBZGQgYSBnbG9iYWwgc2Vjb25kYXJ5IGluZGV4IHRvIHNvcnQgQ2hhdEhpc3RvcnlUYWJsZSBieSB0aW1lX3N0YW1wXG4gICAgY2hhdEhpc3RvcnlUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdUaW1lSW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd1c2VyX2lkJywgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3RpbWVfc3RhbXAnLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgcHJvamVjdGlvblR5cGU6IFByb2plY3Rpb25UeXBlLkFMTCxcbiAgICB9KTtcblxuICAgIHRoaXMuaGlzdG9yeVRhYmxlID0gY2hhdEhpc3RvcnlUYWJsZTtcblxuICAgIC8vIERlZmluZSB0aGUgc2Vjb25kIHRhYmxlIChVc2VyRmVlZGJhY2tUYWJsZSlcbiAgICBjb25zdCB1c2VyRmVlZGJhY2tUYWJsZSA9IG5ldyBUYWJsZShzY29wZSwgJ1VzZXJGZWVkYmFja1RhYmxlJywge1xuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdUb3BpYycsIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdDcmVhdGVkQXQnLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgIH0pO1xuXG4gICAgLy8gQWRkIGEgZ2xvYmFsIHNlY29uZGFyeSBpbmRleCB0byBVc2VyRmVlZGJhY2tUYWJsZSB3aXRoIHBhcnRpdGlvbiBrZXkgQ3JlYXRlZEF0XG4gICAgdXNlckZlZWRiYWNrVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAnQ3JlYXRlZEF0SW5kZXgnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdDcmVhdGVkQXQnLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgcHJvamVjdGlvblR5cGU6IFByb2plY3Rpb25UeXBlLkFMTCxcbiAgICB9KTtcblxuICAgIHVzZXJGZWVkYmFja1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogJ0FueUluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnQW55JywgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ0NyZWF0ZWRBdCcsIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBwcm9qZWN0aW9uVHlwZTogUHJvamVjdGlvblR5cGUuQUxMLFxuICAgIH0pO1xuXG4gICAgdGhpcy5mZWVkYmFja1RhYmxlID0gdXNlckZlZWRiYWNrVGFibGU7ICAgIFxuICB9XG59XG4iXX0=