import { Link, StatusIndicator } from "@cloudscape-design/components";
import { AdminDataType, RagDocumentType } from "../../common/types";
import { Labels } from "../../common/constants";
import { DateTime } from "luxon";
import { Utils } from "../../common/utils";
import { Button } from "@cloudscape-design/components";
import { useNavigate } from "react-router-dom";
import React from "react";
import { TruncatedTextCell } from "../../components/truncated-text-call";


function ViewDetailsButton({ evaluationId }) {
  const navigate = useNavigate();
  console.log("evaluationId: ", evaluationId);

  const viewDetailedEvaluation = (evaluationId) => {
    navigate(`/admin/llm-evaluation/${evaluationId}`);
  };

  return (
    <Button onClick={() => viewDetailedEvaluation(evaluationId)} variant="link">
      View Details
    </Button>
  );
}
// import { Document } from "../../../API";

const FILES_COLUMN_DEFINITIONS = [
  {
    id: "name",
    header: "Name",
    cell: (item) => item.Key!,
    isRowHeader: true,
  },
  {
    id: "createdAt",
    header: "Upload date",
    cell: (item) =>
      DateTime.fromISO(new Date(item.LastModified).toISOString()).toLocaleString(
        DateTime.DATETIME_SHORT
      ),
  },
  {
    id: "size",
    header: "Size",
    cell: (item) => Utils.bytesToSize(item.Size!),
  },
];
/*
const TEXTS_COLUMN_DEFINITIONS = [
  {
    id: "title",
    header: "Title",
    cell: (item: Document) => <>{Utils.textEllipsis(item.title ?? "", 100)}</>,
    isRowHeader: true,
  },
  {
    id: "status",
    header: "Status",
    cell: (item: Document) => (
      <StatusIndicator type={Labels.statusTypeMap[item.status!]}>
        {Labels.statusMap[item.status!]}
      </StatusIndicator>
    ),
  },
  {
    id: "createdAt",
    header: "Upload date",
    cell: (item: Document) =>
      DateTime.fromISO(new Date(item.createdAt).toISOString()).toLocaleString(
        DateTime.DATETIME_SHORT
      ),
  },
];

const RSS_COLUMN_DEFINITIONS = [
  {
    id: "title",
    header: "RSS Feed Title",
    cell: (item: Document) => (
      <Link href={item.workspaceId + "/rss/" + item.id + "/"}>
        {Utils.textEllipsis(item.title ?? "", 100)}
      </Link>
    ),
    isRowHeader: true,
  },
  {
    id: "path",
    header: "RSS Feed URL",
    cell: (item: Document) => <>{Utils.textEllipsis(item.path ?? "", 100)}</>,
    isRowHeader: true,
  },
  {
    id: "status",
    header: "RSS Subscription Status",
    cell: (item: Document) => (
      <StatusIndicator type={Labels.statusTypeMap[item.status!]}>
        {Labels.statusMap[item.status!]}
      </StatusIndicator>
    ),
  },
];

const QNA_COLUMN_DEFINITIONS = [
  {
    id: "title",
    header: "Question",
    cell: (item: Document) => <>{Utils.textEllipsis(item.title ?? "", 100)}</>,
    isRowHeader: true,
  },
  {
    id: "status",
    header: "Status",
    cell: (item: Document) => (
      <StatusIndicator type={Labels.statusTypeMap[item.status!]}>
        {Labels.statusMap[item.status!]}
      </StatusIndicator>
    ),
    isRowHeader: true,
  },
  {
    id: "createdAt",
    header: "Upload date",
    cell: (item: Document) =>
      DateTime.fromISO(new Date(item.createdAt).toISOString()).toLocaleString(
        DateTime.DATETIME_SHORT
      ),
    isRowHeader: true,
  },
];

const WEBSITES_COLUMN_DEFINITIONS = [
  {
    id: "name",
    header: "Name",
    cell: (item: Document) =>
      item.path!.length > 100
        ? item.path!.substring(0, 100) + "..."
        : item.path,
    isRowHeader: true,
  },
  {
    id: "status",
    header: "Status",
    cell: (item: Document) => (
      <StatusIndicator type={Labels.statusTypeMap[item.status!]}>
        {Labels.statusMap[item.status!]}
      </StatusIndicator>
    ),
  },
  {
    id: "subType",
    header: "Type",
    cell: (item: Document) => (
      <>{item.subType == "sitemap" ? "sitemap" : "website"}</>
    ),
    isRowHeader: true,
  },
  {
    id: "subDocuments",
    header: "Pages",
    cell: (item: Document) => item.subDocuments,
    isRowHeader: true,
  },
  {
    id: "createdAt",
    header: "Upload date",
    cell: (item: Document) =>
      DateTime.fromISO(new Date(item.createdAt).toISOString()).toLocaleString(
        DateTime.DATETIME_SHORT
      ),
  },
];*/

const EVAL_SUMMARY_COLUMN_DEFINITIONS = [
  { 
    id: "evaluationName",
    header: "Evaluation Name",
    cell: (item) => <TruncatedTextCell text={item.evaluation_name || "Unnamed Evaluation"} maxLength={50}/>
  },
  {
    id: "evalTestCaseKey",
    header: "Test Case Filename",
    cell: (item) => <TruncatedTextCell text={item.test_cases_key || "Unnamed Test Case"} maxLength={50}/>
  },
  {
    id: "timestamp",
    header: "Timestamp",
    //cell: (item) => new Date(item.timestamp).toLocaleString(),
    cell: (item) =>
      DateTime.fromISO(new Date(item.Timestamp).toISOString()).toLocaleString(
        DateTime.DATETIME_SHORT
      ),
    sortingField: "Timestamp",
    sortingComparator: (a, b) => new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime()
  },
  {
    id: "averageSimilarity",
    header: "Average Similarity",
    cell: (item) =>
      (
        parseFloat(item.average_similarity) 
      ).toFixed(2),
    sortingField: "average_similarity",
    sortingComparator: (a, b) => parseFloat(a.average_similarity) - parseFloat(b.average_similarity),
    width: "10%",
    wrapText: true
  },
  {
    id: "averageRelevance",
    header: "Average Relevance",
    cell: (item) =>
    (
      parseFloat(item.average_relevance) 
    ).toFixed(2),
    sortingField: "average_relevance",
    sortingComparator: (a, b) => parseFloat(a.average_relevance) - parseFloat(b.average_relevance),
    width: "10%",
    wrapText: true
  },
  {
    id: "averageCorrectness",
    header: "Average Correctness",
    cell: (item) =>
    (
      parseFloat(item.average_correctness) 
    ).toFixed(2),
    sortingField: "average_correctness",
    sortingComparator: (a, b) => parseFloat(a.average_correctness) - parseFloat(b.average_correctness),
    width: "10%",
    wrapText: true 
  },
  {
    id: "viewDetails",
    header: "View Details",
    cell: (item) => <ViewDetailsButton evaluationId={item.EvaluationId}/>,
    disableSort: true
  }, 
];


const DETAILED_EVAL_COLUMN_DEFINITIONS = [
  {
    id: "question",
    header: "Question",
    cell: (item) => <TruncatedTextCell text={item.question} maxLength={50}/>
  },
  {
    id: "expectedResponse",
    header: "Expected Response",
    cell: (item) => <TruncatedTextCell text={item.expected_response} maxLength={50}/>
  },
  {
    id: "actualResponse",
    header: "Actual Response",
    cell: (item) => <TruncatedTextCell text={item.actual_response} maxLength={50}/>
  },
  {
    id: "similarity",
    header: "Similarity",
    cell: (item) =>
      (
        parseFloat(item.similarity) 
      ).toFixed(2),
    sortingField: "similarity"
  },
  {
    id: "relevance",
    header: "Relevance",
    cell: (item) =>
    (
      parseFloat(item.relevance) 
    ).toFixed(2),
    sortingField: "relevance"
  },
  {
    id: "correctness",
    header: "Correctness",
    cell: (item) =>
    (
      parseFloat(item.correctness) 
    ).toFixed(2),
    sortingField: "correctness"
  },
];

export function getColumnDefinition(documentType: AdminDataType) {
  switch (documentType) {
    case "file":
      return FILES_COLUMN_DEFINITIONS;
    case "evaluationSummary":
        return EVAL_SUMMARY_COLUMN_DEFINITIONS;
    case "detailedEvaluation":
        return DETAILED_EVAL_COLUMN_DEFINITIONS;
    /*case "text":
      return TEXTS_COLUMN_DEFINITIONS;
    case "qna":
      return QNA_COLUMN_DEFINITIONS;
    case "website":
      return WEBSITES_COLUMN_DEFINITIONS;
    case "rssfeed":
      return RSS_COLUMN_DEFINITIONS;*/
    default:
      return [];
  }
}
