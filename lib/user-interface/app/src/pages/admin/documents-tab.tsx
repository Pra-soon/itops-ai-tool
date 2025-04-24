import {
  Box,
  SpaceBetween,
  Table,
  Pagination,
  Button,
  Header,
  Modal,
  Spinner,
} from "@cloudscape-design/components";
import { useCallback, useContext, useEffect, useState } from "react";
import RouterButton from "../../components/wrappers/router-button";
import { RagDocumentType } from "../../common/types";
import { AdminDataType } from "../../common/types";
import { TableEmptyState } from "../../components/table-empty-state";
import { ApiClient } from "../../common/api-client/api-client";
import { AppContext } from "../../common/app-context";
import { getColumnDefinition } from "./columns";
import { Utils } from "../../common/utils";
import { useCollection } from "@cloudscape-design/collection-hooks";
// import { DocumentsResult } from "../../../API";

export interface DocumentsTabProps {
  documentType: AdminDataType;
}

export default function DocumentsTab(props: DocumentsTabProps) {
  const appContext = useContext(AppContext);
  const apiClient = new ApiClient(appContext);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(1);
  const [pages, setPages] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [showModalDelete, setShowModalDelete] = useState(false);

  // fix "empty" close modal buttons
  useEffect(() => {
    const fixEmptyButtons = () => {
      const buttons = document.querySelectorAll('button.awsui_dismiss-control_1d2i7_11r6m_431.awsui_button_vjswe_1tt9v_153');
  
      buttons.forEach((button) => {
        if (!button.hasAttribute('aria-label')) {
          button.setAttribute('aria-label', 'Close modal'); 
        }
      });
    };
  
    // runs it initiailly
    fixEmptyButtons();
  
    const observer = new MutationObserver(() => {
      fixEmptyButtons();
    });
  
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  
    return () => observer.disconnect();
  }, []);
  
  
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

  // make table accessible by adding text to checkbox column
  useEffect(() => {
    const updateLabels = () => {
      // select all labels of checkbox inputs
      const labels = document.querySelectorAll('label.awsui_label_1s55x_1iop1_145');
  
      labels.forEach((label, index) => {
        const labelElement = label as HTMLLabelElement;
        const checkbox = label.querySelector('input[type="checkbox"]'); // finds checkbox input under label
    
        if (checkbox instanceof HTMLInputElement) {
          // add a span of hidden text
          let hiddenSpan = label.querySelector('.hidden-span') as HTMLSpanElement;
          if (!hiddenSpan) {
            hiddenSpan = document.createElement('span');
            hiddenSpan.className = 'hidden-span';
            hiddenSpan.innerText = checkbox.checked
              ? `Unselect row ${index + 1}`
              : `Select row ${index + 1}`;
  
            hiddenSpan.style.position = 'absolute';
            hiddenSpan.style.width = '1px';
            hiddenSpan.style.height = '1px';
            hiddenSpan.style.padding = '0';
            hiddenSpan.style.margin = '-1px';
            hiddenSpan.style.overflow = 'hidden';
            hiddenSpan.style.whiteSpace = 'nowrap';
            hiddenSpan.style.border = '0';
  
            labelElement.appendChild(hiddenSpan);
          }
  
          // handles checkbox status changes
          const onChangeHandler = () => {
            if (index === 0) {
              hiddenSpan.innerText = checkbox.checked
                ? `Unselect all rows`
                : `Select all rows`;
            } else {
              hiddenSpan.innerText = checkbox.checked
                ? `Unselect row ${index + 1}`
                : `Select row ${index + 1}`;
            }
          };
  
          if (!checkbox.dataset.listenerAdded) {
            checkbox.addEventListener('change', onChangeHandler);
            checkbox.dataset.listenerAdded = 'true';
          }
        }
      });
    };
  
    // first call
    updateLabels();
  
    // monitor changes to table (table items render after the header does)
    const table = document.querySelector('table');
    if (table) {
      const observer = new MutationObserver(() => {
        console.log('Mutation detected, updating labels');
        updateLabels();
      });
  
      observer.observe(table, {
        childList: true,
        subtree: true,
      });
  
      return () => observer.disconnect();
    }
  }, []);

  useEffect(() => {
    const addPaginationLabels = () => {
      const ls = document.querySelector('ul.awsui_root_fvjdu_chz9p_141');
      if (ls) {
        const listItems = ls.querySelectorAll('li');
        
        // all the buttons in between are the page numbers and already have text
        if (listItems.length !== 0) {
          const leftArrow = listItems[0].querySelector('button');
          const rightArrow = listItems[listItems.length - 1].querySelector('button');
          rightArrow.setAttribute('aria-label', 'Go to next page');
          leftArrow.setAttribute('aria-label', 'Go to previous page');
        }
      }
    };
  
    // iniital run
    addPaginationLabels();
  
    const observer = new MutationObserver(() => {
      addPaginationLabels();
    });
  
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  
    return () => observer.disconnect();
  }, []);
  
  const { items, collectionProps, paginationProps } = useCollection(pages, {
    filtering: {
      empty: (
        <Box margin={{ vertical: "xs" }} textAlign="center" color="inherit">
          <SpaceBetween size="m">
            <b>No sessions</b>
          </SpaceBetween>
        </Box>
      ),
    },
    pagination: { pageSize: 5 },
    sorting: {
      defaultState: {
        sortingColumn: {
          sortingField: "Key",
        },
        isDescending: true,
      },
    },
    selection: {},
  });

  const getDocuments = useCallback(
    async (params: { continuationToken?: string; pageIndex?: number }) => {
      setLoading(true);


      try {
        const result = await apiClient.knowledgeManagement.getDocuments(params?.continuationToken, params?.pageIndex)

        setPages((current) => {
          if (typeof params.pageIndex !== "undefined") {
            current[params.pageIndex - 1] = result;
            return [...current];
          } else {
            return [...current, result];
          }
        });
      } catch (error) {
        console.error(Utils.getErrorMessage(error));
      }

      console.log(pages);
      setLoading(false);
    },
    [appContext, props.documentType]
  );


  useEffect(() => {
    getDocuments({});
  }, [getDocuments]);

  const onNextPageClick = async () => {
    const continuationToken = pages[currentPageIndex - 1]?.NextContinuationToken;

    if (continuationToken) {
      if (pages.length <= currentPageIndex) {
        await getDocuments({ continuationToken });
      }
      setCurrentPageIndex((current) => Math.min(pages.length + 1, current + 1));
    }
  };


  const onPreviousPageClick = async () => {
    setCurrentPageIndex((current) =>
      Math.max(1, Math.min(pages.length - 1, current - 1))
    );
  };

  const refreshPage = async () => {
    // console.log(pages[Math.min(pages.length - 1, currentPageIndex - 1)]?.Contents!)
    if (currentPageIndex <= 1) {
      await getDocuments({ pageIndex: currentPageIndex });
    } else {
      const continuationToken = pages[currentPageIndex - 2]?.NextContinuationToken!;
      await getDocuments({ continuationToken });
    }
  };


  const columnDefinitions = getColumnDefinition(props.documentType);

  const deleteSelectedFiles = async () => {
    if (!appContext) return;

    setLoading(true);
    setShowModalDelete(false);
    const apiClient = new ApiClient(appContext);
    await Promise.all(
      selectedItems.map((s) => apiClient.knowledgeManagement.deleteFile(s.Key!))
    );
    await getDocuments({ pageIndex: currentPageIndex });
    setSelectedItems([])
    setLoading(false);
  };

  useEffect(() => {
    if (!appContext) return;
    const apiClient = new ApiClient(appContext);

    const getStatus = async () => {
      try {
        const result = await apiClient.knowledgeManagement.kendraIsSyncing();
        setSyncing(result == "STILL SYNCING");
      } catch (error) {
        console.error(error);
      }
    };

    const interval = setInterval(getStatus, 5000);
    getStatus();

    return () => clearInterval(interval);
  });

  const syncKendra = async () => {    
    if (syncing) {
      // setSyncing(false)
      return;
    }
    setSyncing(true);
    try {
      await apiClient.knowledgeManagement.syncKendra();
      
    } catch (error) {
      console.log(error);
      setSyncing(false)
    }
  }

  return (
    <><Modal
      onDismiss={() => setShowModalDelete(false)}
      visible={showModalDelete}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            {" "}
            <Button variant="link" onClick={() => setShowModalDelete(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={deleteSelectedFiles}>
              Ok
            </Button>
          </SpaceBetween>{" "}
        </Box>
      }
      header={"Delete session" + (selectedItems.length > 1 ? "s" : "")}
    >
      Do you want to delete{" "}
      {selectedItems.length == 1
        ? `file ${selectedItems[0].Key!}?`
        : `${selectedItems.length} files?`}
    </Modal>
      <Table
        {...collectionProps}
        loading={loading}
        loadingText={`Loading files`}
        columnDefinitions={columnDefinitions}
        selectionType="multi"
        onSelectionChange={({ detail }) => {
          console.log(detail);
          setSelectedItems(detail.selectedItems);
        }}
        selectedItems={selectedItems}
        items={pages[Math.min(pages.length - 1, currentPageIndex - 1)]?.Contents!}
        trackBy="Key"
        header={
          <Header
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button iconName="refresh" onClick={refreshPage} ariaLabel="Refresh page" />
                <RouterButton
                  // href={`/rag/workspaces/add-data?workspaceId=${props.workspaceId}&tab=${props.documentType}`}
                  href={`/admin/add-data`}
                >
                  {'Add Files'}
                </RouterButton>
                <Button
                  variant="primary"
                  disabled={selectedItems.length == 0}
                  onClick={() => {
                    if (selectedItems.length > 0) setShowModalDelete(true);
                  }}
                  data-testid="submit">
                  Delete
                </Button>
                <Button
                  variant="primary"
                  disabled={syncing}
                  onClick={() => {
                    syncKendra();
                  }}
                // data-testid="submit"
                >
                  {syncing ? (
                    <>
                      Syncing data...&nbsp;&nbsp;
                      <Spinner />
                    </>
                  ) : (
                    "Sync data now"
                  )}
                </Button>
              </SpaceBetween>
            }
            description="Please expect a delay for your changes to be reflected. Press the refresh button to see the latest changes."
          >
            {"Files"}
          </Header>
        }
        empty={
          <TableEmptyState
            resourceName={"File"}
            // createHref={`/rag/workspaces/add-data?workspaceId=${props.workspaceId}&tab=${props.documentType}`}
            createHref={`/admin/add-data`}
            createText={"Add Files"}
          />
        }
        pagination={
          pages.length === 0 ? null : (
            <Pagination
              openEnd={true}
              pagesCount={pages.length}
              currentPageIndex={currentPageIndex}
              onNextPageClick={onNextPageClick}
              onPreviousPageClick={onPreviousPageClick}
            />
          )
        }
      />
    </>
  );
}