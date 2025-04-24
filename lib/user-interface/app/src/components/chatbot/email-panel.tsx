import React, { useRef, useState } from 'react';
import { useEffect, useContext } from 'react';
import { Container, ContentLayout, Header, Link, SplitPanel, } from '@cloudscape-design/components';
import { ChatBotHistoryItem } from './types';
import { Auth } from 'aws-amplify';
import { assembleHistory } from './utils'
import { AppContext } from "../../common/app-context";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "../../styles/chat.module.scss";

export interface EmailPanelProps {
  isHidden: boolean
  messageHistory: ChatBotHistoryItem[]
}

export default function EmailPanel(props: EmailPanelProps) {
  const appContext = useContext(AppContext);

  const [generatedEmail, setGeneratedEmail] = useState<string>('');
  const firstRender = useRef(true);

  useEffect(() => {
    const arrow = document.querySelector('.awsui_open-button_rjqu5_zu8o5_7');
    arrow.setAttribute('aria-label', 'Click to expand or collapse');


  }, []);

  useEffect(() => {
    const handleGenerateEmail = async () => {
      setGeneratedEmail('');
      console.log("generating email!")
      let username;
      await Auth.currentAuthenticatedUser().then((value) => username = value.username);
      if (!username) return;

//      const TEST_URL = 'wss://caoyb4x42c.execute-api.us-east-1.amazonaws.com/test/';
      if (!appContext.wsEndpoint) {
        console.error('WebSocket endpoint is not configured');
      }
      const TEST_URL = appContext.wsEndpoint;

      // Create a new WebSocket connection
      const TOKEN = (await Auth.currentSession()).getIdToken().getJwtToken()

      // console.log(TOKEN)
      const wsUrl = TEST_URL + '?Authorization=' + TOKEN;
      console.log('wsUrl:', wsUrl);
      const ws = new WebSocket(wsUrl);
      let recieved = '';
      ws.addEventListener('open', function open() {
        console.log('Connected to the WebSocket server');
        // readline.question('What is your question? ', question => {
        const message = JSON.stringify({
          "action": "generateEmail",
          "data": {
            chatHistory: assembleHistory(props.messageHistory),
            systemPrompt: `Given this chat history, please draft an email that summarizes the 
            policies that were discussed. Use the following format:
            Dear [Customer Name],
            
            I received your inquiry on <<TOPIC SUMMARY>>.
            
            <<Fill in the email with a policy quote if possible and answer the question briefly. Reference FTA
            guidelines where possible>>
            <<Make sure to close out the letter in a polite way>>
        
            Best,
            [NAME]`,
          }
        });
        // readline.close();
        // Replace 'Hello, world!' with your message
        ws.send(message);
        // console.log('Message sent:', message);
        // });
      });
      // Event listener for incoming messages
      ws.addEventListener('message', async function incoming(data) {
        console.log(data.data);
        if (data.data.includes("<!ERROR!>:")) {
          // addNotification("error", data.data);
          // console.log(data.data);
          ws.close();
          return;
        }
        recieved += data.data;
        setGeneratedEmail(recieved);
        // if (data.data == '!<|EOF_STREAM|>!') {

        //   incomingMetadata = true;
        //   return;
        //   // return;
        // }

      });
      // Handle possible errors
      ws.addEventListener('error', function error(err) {
        console.error('WebSocket error:', err);
      });
      // Handle WebSocket closure
      ws.addEventListener('close', async function close() {
        setGeneratedEmail(recieved);
        console.log('Disconnected from the WebSocket server');
      });

    }
    if (!firstRender.current) {
      handleGenerateEmail();
    } else {
      firstRender.current = false;
    }
  }, [props.messageHistory])
  return (
    <div>
      {props.isHidden ? null :

        <SplitPanel header="Generated Email"
          i18nStrings={{
            resizeHandleAriaLabel: "Adjust split panel size",
            // closeButtonAriaLabel: "Close panel",
            preferencesTitle: "Split panel preferences",
            preferencesPositionLabel: "Split panel position",
            preferencesPositionDescription: "Choose the default position of the panel",
            preferencesPositionSide: "Side",
            preferencesPositionBottom: "Bottom",
            preferencesConfirm: "Confirm",
            preferencesCancel: "Cancel"
          }}>

          <ReactMarkdown
            children={generatedEmail}
            remarkPlugins={[remarkGfm]}
            components={{
              pre(props) {
                const { children, ...rest } = props;
                return (
                  <pre {...rest} className={styles.codeMarkdown}>
                    {children}
                  </pre>
                );
              },
              table(props) {
                const { children, ...rest } = props;
                return (
                  <table {...rest} className={styles.markdownTable}>
                    {children}
                  </table>
                );
              },
              th(props) {
                const { children, ...rest } = props;
                return (
                  <th {...rest} className={styles.markdownTableCell}>
                    {children}
                  </th>
                );
              },
              td(props) {
                const { children, ...rest } = props;
                return (
                  <td {...rest} className={styles.markdownTableCell}>
                    {children}
                  </td>
                );
              },
            }}
          />
        </SplitPanel>
      }</div>
  );
}