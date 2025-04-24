/**
 * Purpose: WebSocket Event Handler for AWS Lambda
 * 
 * Overview:
 * This file contains a set of functions designed to handle WebSocket events in an AWS Lambda environment.
 * The main entry point is the `handler` function, which processes incoming WebSocket requests and routes
 * them to the appropriate handler based on the event type (connect, disconnect, custom routes).
 * 
 * Environment variables:
 * - `mvp_websocket__api_endpoint_test`: The WebSocket API endpoint used for communication.
 * - `INDEX_ID`: The ID of the Amazon Kendra index to query for relevant documents.
 * - `SESSION_HANDLER`: The name of the Lambda function responsible for handling session data.
 * 
 * Functions:
 * - `processBedrockStream`: Handles the streaming of AI model responses and sends them back to the WebSocket client.
 * - `getPromptWithHistoricalContext`: Enhances user prompts (Mistral7b) by incorporating context from chat history.
 * - `retrieveKendraDocs`: Queries Amazon Kendra to retrieve relevant documents based on the user's enhanced prompt.
 * - `injectKendraDocsInPrompt`: Combines retrieved documents with the user prompt to provide contextually enriched instructions.
 * - `getUserResponse`: Orchestrates the full process of generating a chatbot response (Claude), managing sessions, generating a session title (Mistral7b), and communicating with the client.
 * - `draftEmailResponse`: Generates a formal email draft based on chat history (Claude)
 * - `handler`: The main Lambda function entry point, routing incoming WebSocket events to the appropriate handler.
 * 
 * Usage:
 * Deploy this file as part of an AWS Lambda function connected to an API Gateway WebSocket API. The handler function
 * will automatically manage WebSocket connections, process user inputs, and respond accordingly based on the routes defined.
 * 
 */

import { ApiGatewayManagementApiClient, PostToConnectionCommand, DeleteConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { KendraClient, RetrieveCommand } from "@aws-sdk/client-kendra";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"
import { QueryCommand } from "@aws-sdk/client-kendra";
import ClaudeModel from "./models/claude3Sonnet.mjs";
import Llama13BModel from "./models/llama13b.mjs";
import Mistral7BModel from "./models/mistral7b.mjs"

/*global fetch*/

// initialize a websocket connection client using a endpoint defined in the environment variables 
const ENDPOINT = process.env.mvp_websocket__api_endpoint_test;
const wsConnectionClient = new ApiGatewayManagementApiClient({ endpoint: ENDPOINT });
const WARNING_STRING = "For security and ethical reasons, I can't fulfill your request. Please try again with a different question that is relevant...";


// This function processes a streaming response from a model, sending chunks of the response back to the websocket API
// in real time
async function processBedrockStream(id, modelStream, model) {
  try {
    let model_response = ''

    for await (const event of modelStream) {
      const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
      const parsedChunk = await model.parseChunk(chunk);
      if (parsedChunk) {
        let responseParams = {
          ConnectionId: id,
          Data: parsedChunk.toString()
        }
        model_response = model_response.concat(parsedChunk)

        let command = new PostToConnectionCommand(responseParams);

        try {
          // try sending the chunk to to the endpoint
          await wsConnectionClient.send(command);
        } catch (error) {
          console.error("Error sending chunk:", error);
        }
      }
    }

    return model_response;


  } catch (error) {
    console.error("Stream processing error:", error);
    let responseParams = {
      ConnectionId: id,
      Data: `<!ERROR!>: ${error}`
    }
    let command = new PostToConnectionCommand(responseParams);
    await wsConnectionClient.send(command);
  }
}



// Enhance a user prompt by re-writing it using the context from the chat history
async function getPromptWithHistoricalContext(prompt, history) {
  try {
    // instructions for when there is a chat history 
    if (history.length > 0) {
      let enhancer = new Mistral7BModel();
      // const CONTEXT_COMPLETION_INSTRUCTIONS = "When interacting with a *similarity search program*, consider the relevance of chat history in refining user prompts. If the chat history is pertinent, utilize it to enhance the user's current query. Focus primarily on answering the user's present question, and if the chat history is not applicable, proceed with the user's current prompt alone.";
//      const CONTEXT_COMPLETION_INSTRUCTIONS = "Given a chat history and the latest user question \
//      which might reference context in the chat history, formulate a standalone question \
//      which can be understood without the chat history. Do NOT answer the question, \
//      just reformulate it if needed using relevant keywords from the chat history and otherwise return it as is.";
      const CONTEXT_COMPLETION_INSTRUCTIONS="Take the latest question and rewrite it as a standalone query using only relevant keywords found in the chat history as needed. Retain all acronyms, terms, and phrases exactly as they are. Do not attempt to interpret or explain the question. Do not add explanations, interpretations, or reasoning. Return only the rewritten question, exactly as phrased or minimally restructured to be standalone. DO NOT answer the question.";
      const new_history = history.slice(-3);
      const enhancedPrompt = await enhancer.getResponse(CONTEXT_COMPLETION_INSTRUCTIONS, new_history, prompt);
      console.log("enhancedPrompt: ", enhancedPrompt); 
      return enhancedPrompt.replaceAll('"','');
      // instructions for when there is NO chat history
    } else {
      return prompt.replaceAll('"','');;
    }
  }
  catch (error) {
    console.error("Error in getting prompt with historical context:", error);
    return prompt;
  }
}


/* Retrieves documents from a Kendra index */
async function retrieveKendraDocs(query, kendra, kendraIndex) {
  let params = {
    QueryText: query.slice(0, 999),
    IndexId: kendraIndex,
    PageSize: 12,
    PageNumber: 1,
    SortingConfiguration: {
      DocumentAttributeKey: '_last_updated_at', // Using the built-in attribute for last updated timestamp
      SortOrder: 'DESC' // Ensure latest documents come first
    }
  };

  try {
    const { ResultItems } = await kendra.send(new RetrieveCommand(params));

    console.log("ResultItems: ", JSON.stringify( ResultItems));
    // filter the items based on confidence, we do not want LOW confidence results
    const confidenceFilteredResults = ResultItems.filter(item =>
      item.ScoreAttributes.ScoreConfidence == "VERY_HIGH"
      || item.ScoreAttributes.ScoreConfidence == "HIGH"
      || item.ScoreAttributes.ScoreConfidence == "MEDIUM"
    )
    console.log("confidenceFilteredResults: ", JSON.stringify(confidenceFilteredResults));
    let fullContent = confidenceFilteredResults.map(item => item.Content).join('\n');
    const documentUris = confidenceFilteredResults.map(item => {
      let title;
      if (typeof item.DocumentTitle === 'object' && item.DocumentTitle !== null && 'Text' in item.DocumentTitle) {
        title = item.DocumentTitle.Text;
      } else if (typeof item.DocumentTitle === 'string') {
        title = item.DocumentTitle;
      }
      return { title, uri: item.DocumentURI };
    });

    // removes duplicate sources based on URI
    const flags = new Set();
    const uniqueUris = documentUris.filter(entry => {
      if (flags.has(entry.uri)) {
        return false;
      }
      flags.add(entry.uri);
      return true;
    });

    // console.log(fullContent);

    //Returning both full content and list of document URIs
    if (fullContent == '') {
      fullContent = `No knowledge available! This query is likely outside the scope of the MassHealth Enrollment Center.
      Please provide a general answer but do not attempt to provide specific details.`
      console.log("Warning: no relevant sources found")
    }

    return {
      content: fullContent,
      uris: uniqueUris
    };
  } catch (error) {
    console.error("Caught error: could not retreive Kendra documents:", error);
    // return no context
    return {
      content: `No knowledge available! This query is likely outside the scope of the MassHealth Enrollment Center.
      Please provide a general answer but do not attempt to provide specific details.`,
      uris: []
    };
  }
}


function injectKendraDocsInPrompt(prompt, docs) {
  // Assuming buildPrompt concatenates query and docs into a single string
  console.log(docs);
  return `Instructions:${prompt}\n Context: ${docs}`;
}

/*
getUserResponse orchastrates a series of tasks including enhancing the user prompt, querying kendra
querying claude for a response, managing session data, titling the session, communicating with the websocket client,
and sending sources 
*/
const getUserResponse = async (id, requestJSON) => {
  try {
    const data = requestJSON.data;
    const projectId = data.projectId;
    const systemPrompt = data.systemPrompt;
    const userMessage = data.userMessage;
    const user_id = data.user_id;
    const session_id = data.session_id;
    const chatHistory = data.chatHistory;
    const kendra = new KendraClient({ region: 'us-east-1' });

    if (!process.env.INDEX_ID) {
      throw new Error("ProjectID is not found.");
    }

    const enhancedUserPrompt = await getPromptWithHistoricalContext(userMessage, chatHistory);

    const docString = await retrieveKendraDocs(enhancedUserPrompt, kendra, process.env.INDEX_ID);

    const enhancedSystemPrompt = injectKendraDocsInPrompt(systemPrompt, docString.content);
    let claude = new ClaudeModel();
    let last_5_chat_history = chatHistory.slice(-5);
    const stream = await claude.getStreamedResponse(enhancedSystemPrompt, last_5_chat_history, userMessage);



    let modelResponse = await processBedrockStream(id, stream, claude);


    let command;
    let links = JSON.stringify(docString.uris)
    try {
      // send end of stream message
      let eofParams = {
        ConnectionId: id,
        Data: "!<|EOF_STREAM|>!"
      }
      command = new PostToConnectionCommand(eofParams);
      await wsConnectionClient.send(command);

      // send sources
      let responseParams = {
        ConnectionId: id,
        Data: links
      }
      command = new PostToConnectionCommand(responseParams);
      await wsConnectionClient.send(command);
    } catch (e) {
      console.error("Error sending EOF_STREAM and sources:", e);
    }


    // Fetch data from API
    // const SESSION_ENDPOINT = process.env.mvp_user_session_handler_api_gateway_endpoint;
    /*const historyData = await fetch(SESSION_ENDPOINT, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        "operation": "get_session",
        "user_id": user_id,
        "session_id": session_id
    })
    });*/

    const sessionRequest = {
      body: JSON.stringify({
        "operation": "get_session",
        "user_id": user_id,
        "session_id": session_id
      })
    }
    const client = new LambdaClient({});
    const lambdaCommand = new InvokeCommand({
      FunctionName: process.env.SESSION_HANDLER,
      Payload: JSON.stringify(sessionRequest),
    });

    const { Payload, LogResult } = await client.send(lambdaCommand);
    const result = Buffer.from(Payload).toString();

    // Check if the HTTP request was successful
    if (!result) {
      throw new Error(`Error retriving session data!`);
    }

    // Read and concatenate all data from the stream
    /*const reader = historyData.body.getReader();
    let received = new Uint8Array(0);
    
    while (true) {
        const { value, done } = await reader.read();
        if (done) {
            break;
        }
        if (value) {
            let temp = new Uint8Array(received.length + value.length);
            temp.set(received);
            temp.set(value, received.length);
            received = temp;
        }
    }
    
    // Decode the complete data
    const decoder = new TextDecoder('utf-8');
    const decoded = decoder.decode(received);
    console.log('Decoded string:', decoded); // Check if the decoded string is correct
    */
    // Parse the JSON
    let output = {};
    try {
      const response = JSON.parse(result);
      output = JSON.parse(response.body);
      console.log('Parsed JSON:', output);
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      let responseParams = {
        ConnectionId: id,
        Data: '<!ERROR!>: Unable to load past messages, please retry your query'
      }
      command = new PostToConnectionCommand(responseParams);
      await wsConnectionClient.send(command);
      return; // Optional: Stop further execution in case of JSON parsing errors
    }

    // Continue processing the data
    const retrievedHistory = output.chat_history;
    let operation = '';
    let title = ''; // Ensure 'title' is initialized if used later in your code

    // Further logic goes here

    let new_chat_entry = { "user": userMessage, "chatbot": modelResponse, "metadata": links };
    if (retrievedHistory === undefined) {
      operation = 'add_session';
      let title_model = new Mistral7BModel();
      const CONTEXT_COMPLETION_INSTRUCTIONS =
        `<s>[INST]Generate a concise title for this chat session based on the initial user prompt and response. The title should succinctly capture the essence of the chat's main topic without adding extra content.[/INST]
      [INST]${userMessage}[/INST]
      ${modelResponse} </s>
      Here's your session title:`;
      title = await title_model.getPromptedResponse(CONTEXT_COMPLETION_INSTRUCTIONS, 25);
      title = title.replaceAll(`"`, '');
    } else {
      operation = 'update_session';
    }

    // save session to db
    /*const response = await fetch(SESSION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "operation": operation,
        "user_id": user_id,
        "session_id": session_id,
        "new_chat_entry": new_chat_entry,

        "title": title
      })
    });*/

    const sessionSaveRequest = {
      body: JSON.stringify({
        "operation": operation,
        "user_id": user_id,
        "session_id": session_id,
        "new_chat_entry": new_chat_entry,
        "title": title
      })
    }
    // const client = new LambdaClient({});
    const lambdaSaveCommand = new InvokeCommand({
      FunctionName: process.env.SESSION_HANDLER,
      Payload: JSON.stringify(sessionSaveRequest),
    });

    // const { SessionSavePayload, SessionSaveLogResult } = 
    await client.send(lambdaSaveCommand);
    // const result = Buffer.from(Payload).toString();

    const input = {
      ConnectionId: id,
    };
    await wsConnectionClient.send(new DeleteConnectionCommand(input));

  } catch (error) {
    console.error("Error:", error);
    let responseParams = {
      ConnectionId: id,
      Data: `<!ERROR!>: ${error}`
    }
    let command = new PostToConnectionCommand(responseParams);
    await wsConnectionClient.send(command);
  }
}


// takes the chat history and drafts a formal email summarizing the chat history 
const draftEmailResponse = async (id, requestJSON) => {
  try {
    const data = requestJSON.data;
    const history = data.chatHistory;

    let emailPrompt = `Given this chat history, please draft an email that summarizes the policies that were discussed. Use the following format:
    Dear [Customer Name],

    I received your inquiry on "<<TOPIC SUMMARY>>"}.

    "<<Fill in the email with a policy quote if possible and answer the question briefly. Reference FTA guidelines where possible>>"}
    <<Make sure to close out the letter in a polite way>>

    Best,
    [Your Name Here]`;

    let claude = new ClaudeModel();

    const stream = await claude.getStreamedResponse(emailPrompt, history, "Turn this into an email")

    let modelResponse = await processBedrockStream(id, stream, claude)

    // let eofParams = {
    //       ConnectionId: id,
    //       Data: "!<|EOF_STREAM|>!"
    //     }
    // let command = new PostToConnectionCommand(eofParams);
    // await wsConnectionClient.send(command);

    const input = {
      ConnectionId: id,
    };
    await wsConnectionClient.send(new DeleteConnectionCommand(input));
    console.log("successfully did the email")
  }

  catch (e) {
    console.log(e)
  }
}


// async function processStreamedResponse(stream, model){
//   let responseContent = '';

//   for await (const chunk of stream){
//     responseContent += chunk.content;
//   }
// }



// Acts as a entry point for Lambda functions. processing incoming websocket requests and routing them 
// based on the type of event. 
export const handler = async (event) => {
  if (event.requestContext) {
    const connectionId = event.requestContext.connectionId;
    const routeKey = event.requestContext.routeKey;
    let body = {};
    try {
      if (event.body) {
        body = JSON.parse(event.body);
      }
    } catch (err) {
      console.error("Failed to parse JSON:", err)
    }
    console.log(routeKey);

    switch (routeKey) {
      case '$connect':
        console.log('CONNECT')
        return { statusCode: 200 };
      case '$disconnect':
        console.log('DISCONNECT')
        return { statusCode: 200 };
      case '$default':
        console.log('DEFAULT')
        return { 'action': 'Default Response Triggered' }
      case "getChatbotResponse":
        console.log('GET CHATBOT RESPONSE')
        await getUserResponse(connectionId, body)
        return { statusCode: 200 };
      case "generateEmail":
        console.log('email')
        await draftEmailResponse(connectionId, body)
        return { status: 200 };
      default:
        return {
          statusCode: 404,  // 'Not Found' status code
          body: JSON.stringify({
            error: "The requested route is not recognized."
          })
        };
    }
  }
  return {
    statusCode: 200,
  };
};
