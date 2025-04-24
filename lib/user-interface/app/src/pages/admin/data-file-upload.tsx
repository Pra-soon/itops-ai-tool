import {
  Button,
  Container,
  FileUpload,
  Flashbar,
  FlashbarProps,
  Form,
  FormField,
  ProgressBar,
  ProgressBarProps,
  SpaceBetween,
} from "@cloudscape-design/components";
import { useContext, useEffect, useState } from "react";
import { AppContext } from "../../common/app-context";
import { ApiClient } from "../../common/api-client/api-client";
import { Utils } from "../../common/utils";
import { FileUploader } from "../../common/file-uploader";
import { useNavigate } from "react-router-dom";


const fileExtensions = new Set([
  ".csv",
  ".doc",
  ".docx",
  ".epub",
  ".odt",
  ".pdf",
  ".ppt",
  ".pptx",
  ".tsv",
  ".xlsx",
  ".eml",
  ".html",
  ".json",
  ".md",
  ".msg",
  ".rst",
  ".rtf",
  ".txt",
  ".xml",
]);

const mimeTypes = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.zip': 'application/zip',
  '.rar': 'application/x-rar-compressed',
  '.tar': 'application/x-tar'
};

export default function DataFileUpload() {
  const appContext = useContext(AppContext);
  const apiClient = new ApiClient(appContext);
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [globalError, setGlobalError] = useState<string | undefined>(undefined);
  const [uploadError, setUploadError] = useState<string | undefined>(undefined);
  const [uploadingStatus, setUploadingStatus] =
    useState<FlashbarProps.Type>("info");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadingIndex, setUploadingIndex] = useState<number>(0);
  const [currentFileName, setCurrentFileName] = useState<string>("");
  const [uploadPanelDismissed, setUploadPanelDismissed] =
    useState<boolean>(false);
    
  // fix broken aria menu
  useEffect(() => {
    const fixAriaMenus = () => {
      const problematicMenus = document.querySelectorAll('ul.awsui_options-list_19gcf_1hl2l_141');
  
      problematicMenus.forEach((menu) => {
        if (menu.getAttribute('role') === 'menu') {
          menu.removeAttribute('role');
        }
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
  
  const onSetFiles = (files: File[]) => {
    const errors: string[] = [];
    const filesToUpload: File[] = [];
    setUploadError(undefined);

    if (files.length > 100) {
      setUploadError("Max 100 files allowed");
      files = files.slice(0, 100);
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExtension = file.name.split(".").pop()?.toLowerCase();

      if (!fileExtensions.has(`.${fileExtension}`)) {
        errors[i] = "Format not supported";
      } else if (file.size > 1000 * 1000 * 100) {
        errors[i] = "File size is too large, max 100MB";
      } else {
        filesToUpload.push(file);
      }
    }

    setFiles(files);
    setFileErrors(errors);
    setFilesToUpload(filesToUpload);
  };

  const onUpload = async () => {
    if (!appContext) return;
    setUploadingStatus("in-progress");
    setUploadProgress(0);
    setUploadingIndex(1);
    setUploadPanelDismissed(false);

    // Find the dismiss button and set the aria-label
    const dismissButtons = document.querySelectorAll('div.awsui_dismiss-button-wrapper_1q84n_1w478_170 button');
    if (!dismissButtons) {
        console.log("useEffect->Dismiss Buttons not found");
    }
    dismissButtons.forEach((dismissButton, index) => {
        dismissButton.setAttribute('aria-label', 'Dismiss message button'); 
        console.log(`useEffect->data-file-upload: Set aria-label to Dismiss Button ${index + 1}:`, dismissButton.getAttribute('aria-label'));
    });

    // Find the status icon and set the aria-label to the current upload status
    const flashFocusContainer = document.querySelector('div.awsui_flash-focus-container_1q84n_1w478_794');
    if (flashFocusContainer) {
        // Find all elements within the container that have the role "img"
        const icons = flashFocusContainer.querySelectorAll('[role="img"]');

        // Iterate over the icons for further processing if needed
        icons.forEach((icon, index) => {
          icon.setAttribute('aria-label', 
                    uploadingStatus === "success"
                          ? "Upload successful status icon"
                          : uploadingStatus === "error"
                              ? "Upload failed status icon"
                              : "Uploading in progress status icon",);
        });
      } else {
          console.log('OnUpload->data-file-upload: Flash focus container not found');
      }
//      const statusIcon = document.querySelector('.awsui_flash-icon_1q84n_1w478_193.awsui_flash-text_1q84n_1w478_824');
//      if (statusIcon) {
//          statusIcon.setAttribute('aria-label', 
//                          uploadingStatus === "success"
//                                ? "Upload successful status icon"
//                                : uploadingStatus === "error"
//                                    ? "Upload failed status icon"
//                                    : "Uploading in progress status icon",);
//      }

    const uploader = new FileUploader();
    // const apiClient = new ApiClient(appContext);
    const totalSize = filesToUpload.reduce((acc, file) => acc + file.size, 0);
    let accumulator = 0;
    let hasError = false;

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      setCurrentFileName(file.name);
      let fileUploaded = 0;

      try {
        
        const fileExtension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        const fileType = mimeTypes[fileExtension];
        const result = await apiClient.knowledgeManagement.getUploadURL(file.name,fileType);
        // console.log(result);      
        try {
          await uploader.upload(
            file,
            result, //.data!.getUploadFileURL!,
            fileType,
            (uploaded: number) => {
              fileUploaded = uploaded;
              const totalUploaded = fileUploaded + accumulator;
              const percent = Math.round((totalUploaded / totalSize) * 100);
              setUploadProgress(percent);
            }
          );

          accumulator += file.size;
          setUploadingIndex(Math.min(filesToUpload.length, i + 2));
        } catch (error) {
          console.error(error);
          setUploadingStatus("error");
          hasError = true;
          break;
        }
      } catch (error: any) {
        setGlobalError(Utils.getErrorMessage(error));
        console.error(Utils.getErrorMessage(error));
        setUploadingStatus("error");
        hasError = true;
        break;
      }
    }

    if (!hasError) {
      setUploadingStatus("success");
      setFilesToUpload([]);
      setFiles([]);
    }
  };

  const getProgressbarStatus = (): ProgressBarProps.Status => {
    if (uploadingStatus === "error") return "error";
    if (uploadingStatus === "success") return "success";
    return "in-progress";
  };

  /*const hasReadyWorkspace =
    typeof props.data.workspace?.value !== "undefined" &&
    typeof props.selectedWorkspace !== "undefined" &&
    props.selectedWorkspace.status === "ready";*/

    useEffect(() => {
      // Find the dismiss button and set the aria-label
//      const dismissButton = document.querySelector('.awsui_dismiss-button_1q84n_1w478_170.awsui_button_vjswe_1tt9v_153.awsui_variant-flashbar-icon_vjswe_1tt9v_247.awsui_button-no-text_vjswe_1tt9v_1133');
      const dismissButtons = document.querySelectorAll('div.awsui_dismiss-button-wrapper_1q84n_1w478_170 button');
      if (!dismissButtons) {
          console.log("useEffect->data-file-upload: Dismiss Buttons not found");
      }
      dismissButtons.forEach((dismissButton, index) => {
          dismissButton.setAttribute('aria-label', 'Dismiss message button'); 
      });

      // Find the status icon and set the aria-label to the current upload status
      const flashFocusContainer = document.querySelector('div.awsui_flash-focus-container_1q84n_1w478_794');
      if (flashFocusContainer) {
        // Find all elements within the container that have the role "img"
        const icons = flashFocusContainer.querySelectorAll('[role="img"]');

        // Iterate over the icons for further processing if needed
        icons.forEach((icon, index) => {
            icon.setAttribute('aria-label', 
                 uploadingStatus === "success"
                      ? "Upload successful status icon"
                      : uploadingStatus === "error"
                          ? "Upload failed status icon"
                          : "Uploading in progress status icon",);
        });
      } else {
          console.log('data-file-upload: Flash focus container not found');
      }
//      const statusIcon = document.querySelector('.awsui_flash-icon_1q84n_1w478_193.awsui_flash-text_1q84n_1w478_824');
//      if (statusIcon) {
//          statusIcon.setAttribute('aria-label', 
//                          uploadingStatus === "success"
//                                ? "Upload successful status icon"
//                                : uploadingStatus === "error"
//                                    ? "Upload failed status icon"
//                                    : "Uploading in progress status icon",);
//      }

    }, [uploadingStatus]);

  return (
    <Form
      actions={
        <SpaceBetween direction="horizontal" size="xs">
          <Button
            data-testid="create"
            variant="primary"
            disabled={
              filesToUpload.length === 0 ||
              uploadingStatus === "in-progress"
              // !hasReadyWorkspace
            }
            onClick={onUpload}
          >
            Upload files
          </Button>
        </SpaceBetween>
      }
      errorText={globalError}
    >
      <SpaceBetween size="l">
        <Container>
          <SpaceBetween size="l">
            <FormField>
              <FileUpload
                onChange={({ detail }) => onSetFiles(detail.value)}
                value={files}
                i18nStrings={{
                  uploadButtonText: (e) => (e ? "Choose files" : "Choose file"),
                  dropzoneText: (e) =>
                    e ? "Drop files to upload" : "Drop file to upload",
                  removeFileAriaLabel: (e) => `Remove file ${e + 1}`,
                  limitShowFewer: "Show fewer files",
                  limitShowMore: "Show more files",
                  errorIconAriaLabel: "Error",
                }}
                multiple
                showFileLastModified
                showFileSize
                showFileThumbnail
                tokenLimit={3}
                constraintText={`Text documents up to 100MB supported (${Array.from(
                  fileExtensions.values()
                ).join(", ")})`}
                fileErrors={fileErrors}
                errorText={uploadError}
              />
            </FormField>
          </SpaceBetween>
        </Container>
        {uploadingStatus !== "info" && !uploadPanelDismissed && (
          <Flashbar
            items={[
              {
                content: (
                  <ProgressBar
                    value={uploadProgress}
                    variant="flash"
                    description={
                      uploadingStatus === "success" ||
                      uploadingStatus === "error"
                        ? null
                        : currentFileName
                    }
                    label={
                      uploadingStatus === "success" ||
                      uploadingStatus === "error"
                        ? "Uploading files"
                        : `Uploading files ${uploadingIndex} of ${filesToUpload.length}`
                    }
                    status={getProgressbarStatus()}
                    resultText={
                      uploadingStatus === "success"
                        ? "Upload complete"
                        : "Upload failed"
                    }
                  />
                ),
                type: uploadingStatus,
                dismissible:
                  uploadingStatus === "success" || uploadingStatus === "error",
                dismissLabel: "Dismiss message",
                onDismiss: () => setUploadPanelDismissed(true),
                buttonText:
                  uploadingStatus === "success" ? "View files" : undefined,
                onButtonClick: () =>
                  navigate(
                    `/admin/data`
                  ),
                statusIconAriaLabel: 
                  uploadingStatus === "success"
                    ? "Upload successful"
                    : uploadingStatus === "error"
                        ? "Upload failed"
                        : "Uploading in progress",
                
              },
            ]}
          />
        )}
      </SpaceBetween>
    </Form>
  );
}
