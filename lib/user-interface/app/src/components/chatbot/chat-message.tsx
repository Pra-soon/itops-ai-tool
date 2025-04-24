import {
  Alert,
  Box,
  Button,
  Container,
  ExpandableSection,
  Popover,
  Spinner,
  StatusIndicator,
  Tabs,
  TextContent,
  Textarea,
  Cards,
  SpaceBetween,
  Header,
  Link,
  ButtonDropdown,
  Modal,
  FormField,
  Input,
  Select
} from "@cloudscape-design/components";
import * as React from "react";
import { useEffect, useState, ReactElement } from 'react';
import { JsonView, darkStyles } from "react-json-view-lite";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "../../styles/chat.module.scss";
import {
  ChatBotConfiguration,
  ChatBotHistoryItem,
  ChatBotMessageType,
  ImageFile,
  RagDocument,
} from "./types";

import { getSignedUrl } from "./utils";

import "react-json-view-lite/dist/index.css";
import "../../styles/app.scss";
import { useNotifications } from "../notif-manager";
import { Utils } from "../../common/utils";
import { v4 as uuidv4 } from 'uuid';
import { feedbackCategories, feedbackTypes } from '../../common/constants'

export interface ChatMessageProps {
  message: ChatBotHistoryItem;
  configuration?: ChatBotConfiguration;
  showMetadata?: boolean;
  onThumbsUp: () => void;
  onThumbsDown: (feedbackTopic: string, feedbackType: string, feedbackMessage: string) => void;
  onSendEmail: () => void;
}



export default function ChatMessage(props: ChatMessageProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [message] = useState<ChatBotHistoryItem>(props.message);
  const [files, setFiles] = useState<ImageFile[]>([] as ImageFile[]);
  const [documentIndex, setDocumentIndex] = useState("0");
  const [promptIndex, setPromptIndex] = useState("0");
  const [selectedIcon, setSelectedIcon] = useState<1 | 0 | null>(null);
  const { addNotification, removeNotification } = useNotifications();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTopic, setSelectedTopic] = React.useState({ label: "Select a Topic", value: "1" });
  const [selectedFeedbackType, setSelectedFeedbackType] = React.useState({ label: "Select a Problem", value: "1" });
  const [value, setValue] = useState("");

  // fix broken aria menu (From i think the generate email since it's a submit button)
  useEffect(() => {
    const fixAriaMenus = () => {
      const problematicMenus = document.querySelectorAll('ul.awsui_options-list_19gcf_1hl2l_141');
      problematicMenus.forEach((menu) => {
        // if (menu.getAttribute('role') === 'menu') {
        //   menu.removeAttribute('role');
        // }
        menu.setAttribute('role', 'menubar');
      });
    };

    // runs this initally
    fixAriaMenus();

    const observer = new MutationObserver(() => {
      fixAriaMenus();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);


  // add text to copy btn
  useEffect(() => {
    const divs = document.querySelectorAll('div.awsui_content-inner_14iqq_1kla9_492');
    let btn;
    for (const div of divs) {
      btn = div.querySelector('button.awsui_button_vjswe_1tt9v_153');
      if (!btn.querySelector('.hidden-span')) {
        const hiddenSpan = document.createElement('span');
        hiddenSpan.className = 'hidden-span';
        hiddenSpan.innerText = 'Copy text';

        // makes text invisible
        hiddenSpan.style.position = 'absolute';
        hiddenSpan.style.width = '1px';
        hiddenSpan.style.height = '1px';
        hiddenSpan.style.padding = '0';
        hiddenSpan.style.margin = '-1px';
        hiddenSpan.style.overflow = 'hidden';
        hiddenSpan.style.whiteSpace = 'nowrap';
        hiddenSpan.style.border = '0';

        btn.appendChild(hiddenSpan);
      }
    }
  }, []);

  // add text to those weird modals
  useEffect(() => {
    const interval = setInterval(() => {
      const dismissButtons = document.querySelectorAll('button.awsui_dismiss-control_1d2i7_11r6m_431');

      dismissButtons.forEach((button) => {
        if (!button.hasAttribute('aria-label')) {
          button.setAttribute('aria-label', 'Close modal');
        }
      });

      if (dismissButtons.length > 0) {
        clearInterval(interval);
      }
    }, 500); // check every 500ms

    return () => clearInterval(interval);
  }, []);

  // add text to thumbs btns
  useEffect(() => {
    const divs = document.querySelectorAll('div._thumbsContainer_1nrwp_159');
    for (const div of divs) {
      const btns = div?.querySelectorAll('button');
      console.log(btns.length)
      const thumbsUp = btns[0];
      if (!thumbsUp.querySelector('thumbs-up')) {
        const upSpan = document.createElement('span');
        upSpan.className = 'thumbs-up';
        upSpan.innerText = 'Thumbs Up';

        // makes text invisible
        upSpan.style.position = 'absolute';
        upSpan.style.width = '1px';
        upSpan.style.height = '1px';
        upSpan.style.padding = '0';
        upSpan.style.margin = '-1px';
        upSpan.style.overflow = 'hidden';
        upSpan.style.whiteSpace = 'nowrap';
        upSpan.style.border = '0';

        thumbsUp.appendChild(upSpan);
      }

      const thumbsDown = btns[1];
      if (!thumbsDown.querySelector('thumbs-down')) {
        const downSpan = document.createElement('span');
        downSpan.className = 'thumbs-down';
        downSpan.innerText = 'Thumbs Down';

        // makes text invisible
        downSpan.style.position = 'absolute';
        downSpan.style.width = '1px';
        downSpan.style.height = '1px';
        downSpan.style.padding = '0';
        downSpan.style.margin = '-1px';
        downSpan.style.overflow = 'hidden';
        downSpan.style.whiteSpace = 'nowrap';
        downSpan.style.border = '0';

        thumbsDown.appendChild(downSpan);
      }
    }
  }, []);


  useEffect(() => {
    const getSignedUrls = async () => {
      setLoading(true);
      if (message.metadata?.files as ImageFile[]) {
        const files: ImageFile[] = [];
        for await (const file of message.metadata?.files as ImageFile[]) {
          const signedUrl = await getSignedUrl(file.key);
          files.push({
            ...file,
            url: signedUrl as string,
          });
        }

        setLoading(false);
        setFiles(files);
      }
    };

    if (message.metadata?.files as ImageFile[]) {
      getSignedUrls();
    }
  }, [message]);

  const content =
    props.message.content && props.message.content.length > 0
      ? props.message.content
      : props.message.tokens?.map((v) => v.value).join("");

  const showSources = props.message.metadata?.Sources && (props.message.metadata.Sources as any[]).length > 0;


  return (
    <div>
      <Modal
        onDismiss={() => setModalVisible(false)}
        visible={modalVisible}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => {
                setModalVisible(false)
                setValue("")
                setSelectedTopic({ label: "Select a Topic", value: "1" })
                setSelectedFeedbackType({ label: "Select a Topic", value: "1" })
              }}
              >Cancel</Button>
              <Button variant="primary" onClick={() => {
                if (!selectedTopic.value || !selectedFeedbackType.value || selectedTopic.value === "1" || selectedFeedbackType.value === "1" || value.trim() === "") {
                  const id = addNotification("error", "Please fill out all fields.")
                  Utils.delay(3000).then(() => removeNotification(id));
                  return;
                } else {
                  setModalVisible(false)
                  setValue("")

                  const id = addNotification("success", "Your feedback has been submitted.")
                  Utils.delay(3000).then(() => removeNotification(id));

                  props.onThumbsDown(selectedTopic.value, selectedFeedbackType.value, value.trim());
                  setSelectedIcon(0);

                  setSelectedTopic({ label: "Select a Topic", value: "1" })
                  setSelectedFeedbackType({ label: "Select a Problem", value: "1" })


                }
              }}>Ok</Button>
            </SpaceBetween>
          </Box>
        }
        header="Provide Feedback"

      >
        <SpaceBetween size="xs">
          <Select
            selectedOption={selectedTopic}
            onChange={({ detail }) => setSelectedTopic({ label: detail.selectedOption.label, value: detail.selectedOption.value })}
            options={feedbackCategories}
            ariaLabel="Select feedback topic"
            ariaRequired={true}
            invalid={!selectedTopic.value || selectedTopic.value === "1"}
          />
          <Select
            selectedOption={selectedFeedbackType}
            onChange={({ detail }) => setSelectedFeedbackType({ label: detail.selectedOption.label, value: detail.selectedOption.value })}
            options={feedbackTypes}
            ariaLabel="Select feedback type"
            ariaRequired={true}
            invalid={!selectedFeedbackType.value || selectedFeedbackType.value === "1"}
          />
          <FormField label="Please enter feedback here"
            errorText={value.trim() === "" ? "Feedback is required" : undefined}>
            <Input
              onChange={({ detail }) => setValue(detail.value)}
              value={value}
              ariaLabel="Feedback details"
              ariaRequired={true}
              invalid={value.trim() === ""}
            />
          </FormField>
        </SpaceBetween>
      </Modal>
      {props.message?.type === ChatBotMessageType.AI && (
        <Container
          footer={
            showSources && (
              // <ExpandableSection variant="footer" headerText="Sources">
              //   <Cards
              //     cardDefinition={{
              //       header: item => (
              //         <Link href={item.uri} fontSize="body-s">
              //           {item.title}
              //         </Link>
              //       ),
              //     }}
              //     cardsPerRow={[
              //       { cards: 1 },
              //       { minWidth: 500, cards: 3 }
              //     ]}
              //     items={props.message.metadata.Sources as any[]}
              //     loadingText="Loading sources..."
              //     empty={
              //       <Box
              //         margin={{ vertical: "xs" }}
              //         textAlign="center"
              //         color="inherit"
              //       >
              //         <SpaceBetween size="m">
              //           <b>No resources</b>
              //           <Button>Create resource</Button>
              //         </SpaceBetween>
              //       </Box>
              //     }
              //   />
              // </ExpandableSection>
              <SpaceBetween direction="horizontal" size="s">
                <ButtonDropdown
                    expandToViewport={true}
                    ariaLabel="Cited sources"  
                    items={(props.message.metadata.Sources as any[]).map((item) => {
                     return {
                        id: item.uri, // Using uri as unique id instead of static "id"
                        disabled: false,
                        text: item.title,
                        href: item.uri,
                        external: true,
                        externalIconAriaLabel: "(opens in new tab)",
                        ariaLabel: `Open ${item.title} in new tab`,
                        role: "menuitem", // Add explicit role
                      };
                    })}
                >Sources</ButtonDropdown>
                <Button onClick={() => {
                  props.onSendEmail()
                }}>Generate Email</Button>
              </SpaceBetween>
            )
          }
        >
          {content?.length === 0 ? (
            <Box>
              <Spinner />
            </Box>
          ) : null}
          {props.message.content && props.message.content.length > 0 ? (
            <div className={styles.btn_chabot_message_copy}>
              <Popover
                size="medium"
                position="top"
                triggerType="custom"
                dismissButton={false}
                content={
                  <StatusIndicator type="success">
                    Copied to clipboard
                  </StatusIndicator>
                }
              >
                <Button
                  variant="inline-icon"
                  iconName="copy"
                  ariaLabel="Copy Button"
                  onClick={() => {
                    navigator.clipboard.writeText(props.message.content);
                  }}
                />
              </Popover>
            </div>
          ) : null}
          <ReactMarkdown
            children={content}
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
                  <th {...rest}
                    className={styles.markdownTableCell}>
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
          <div className={styles.thumbsContainer}>
            {(selectedIcon === 1 || selectedIcon === null) && (
              <Button
                variant="icon"
                iconName={selectedIcon === 1 ? "thumbs-up-filled" : "thumbs-up"}
                ariaLabel="Thumbs up icon"
                onClick={() => {
                  // console.log("pressed thumbs up!")
                  props.onThumbsUp();
                  const id = addNotification("success", "Thank you for your valuable feedback!")
                  Utils.delay(3000).then(() => removeNotification(id));
                  setSelectedIcon(1);
                }}
              />
            )}
            {(selectedIcon === 0 || selectedIcon === null) && (
              <Button
                iconName={
                  selectedIcon === 0 ? "thumbs-down-filled" : "thumbs-down"
                }
                variant="icon"
                ariaLabel="Thumbs down icon"
                onClick={() => {
                  // props.onThumbsDown();
                  // setSelectedIcon(0);
                  setModalVisible(true);
                }}
              />
            )}
          </div>
        </Container>
      )}
      {loading && (
        <Box float="left">
          <Spinner />
        </Box>
      )}
      {files && !loading && (
        <>
          {files.map((file, idx) => (
            <a
              key={idx}
              href={file.url as string}
              target="_blank"
              rel="noreferrer"
              style={{ marginLeft: "5px", marginRight: "5px" }}
            >
              <img
                src={file.url as string}
                className={styles.img_chabot_message}
              />
            </a>
          ))}
        </>
      )}
      {props.message?.type === ChatBotMessageType.Human && (
        <TextContent>
          <strong>{props.message.content}</strong>
        </TextContent>
      )}
    </div>
  );
}