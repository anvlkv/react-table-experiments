import React from "react";
import styled from "styled-components";
import { useTable, useBlockLayout } from "react-table";
import { FixedSizeList } from "react-window";
import scrollbarWidth from "./scrollbarWidth";
import PCancelable from "p-cancelable";
import makeData from "./makeData";

const Styles = styled.div`
  padding: 1rem;

  .table {
    display: inline-block;
    border-spacing: 0;
    border: 1px solid black;

    .tr {
      :last-child {
        .td {
          border-bottom: 0;
        }
      }
    }

    .th,
    .td {
      margin: 0;
      padding: 0.5rem;
      border-bottom: 1px solid black;
      border-right: 1px solid black;

      :last-child {
        border-right: 1px solid black;
        :first-child {
          width: 100%
          text-align: center;
          color: gray;
        }
      }
    }
  }
`;

function TableSection({ columns, data, onFetchData }) {
  const defaultColumn = React.useMemo(
    () => ({
      width: 150
    }),
    []
  );

  const scrollBarSize = React.useMemo(() => scrollbarWidth(), []);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    totalColumnsWidth,
    prepareRow,
    setHiddenColumns,
    columns: tableColumns,
  } = useTable(
    {
      columns,
      data,
      defaultColumn
    },
    useBlockLayout
  );

  React.useEffect(() => {
    setHiddenColumns(["loading"]);
  }, [setHiddenColumns]);

  function onRowsRendered({ overscanStartIndex, overscanStopIndex }) {
    if (
      data.slice(overscanStartIndex, overscanStopIndex).some((d) => d.loading)
    ) {
      onFetchData(overscanStartIndex, overscanStopIndex);
    }
  }

  console.log(tableColumns);

  const RenderRow = React.useCallback(
    ({ index, style }) => {
      const row = rows[index];
      prepareRow(row);
      const rowProps = row.getRowProps({
        style
      });

      return (
        <div {...rowProps} className="tr">
          {!row.values.loading ? (
            row.cells.map((cell) => {
              return (
                <div {...cell.getCellProps()} className="td">
                  {cell.render("Cell")}
                </div>
              );
            })
          ) : (
            <div className="td">... loading</div>
          )}
        </div>
      );
    },
    [prepareRow, rows]
  );

  // Render the UI for your table
  return (
    <div {...getTableProps()} className="table">
      <div>
        {headerGroups.map((headerGroup) => (
          <div {...headerGroup.getHeaderGroupProps()} className="tr">
            {headerGroup.headers.map((column) => (
              <div {...column.getHeaderProps()} className="th">
                {column.render("Header")}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div {...getTableBodyProps()}>
        <FixedSizeList
          height={400}
          itemCount={rows.length}
          itemSize={35}
          onItemsRendered={onRowsRendered}
          width={totalColumnsWidth + scrollBarSize}
        >
          {RenderRow}
        </FixedSizeList>
      </div>
    </div>
  );
}

function Table({ columns, data, onFetchData }) {
  const sharedFetch = (start, end) => {
    // hmm

    onFetchData();
  };
  return [null, null, null].reduce((tables, table, at, all) => {
    if (at === 0) {
      //left locked
      const leftLocked = columns.filter((c) => c.fixed === "left");
      if (leftLocked.length) {
        tables.push(
          <TableSection
            key="left"
            columns={leftLocked}
            data={data}
            onFetchData={sharedFetch}
          />
        );
      }
    }
    if (at === 2) {
      // right locked
      const rightLocked = columns.filter((c) => c.fixed === "right");
      if (rightLocked.length) {
        tables.push(
          <TableSection
            key="right"
            columns={rightLocked}
            data={data}
            onFetchData={sharedFetch}
          />
        );
      }
    }
    if (at === 1) {
      const rest = columns.filter((c) => !c.fixed);
      if (rest.length) {
        tables.push(
          <TableSection
            key="center"
            columns={rest}
            data={data}
            onFetchData={sharedFetch}
          />
        );
      }
    }

    return tables;
  }, []);
}

function App() {
  const columns = React.useMemo(
    () => [
      {
        accessor: "loading"
      },
      {
        Header: "Row Index",
        accessor: (row, i) => i,
        fixed: "left"
      },
      {
        Header: "A entity",
        columns: [
          {
            Header: "A1 prop",
            accessor: "firstName"
          },
          {
            Header: "A2 prop",
            accessor: "lastName"
          }
        ]
      },
      {
        Header: "B entity",
        columns: [
          {
            Header: "B1 prop",
            accessor: "age"
          },
          {
            Header: "B2 prop",
            accessor: "visits"
          }
        ]
      }
    ],
    []
  );

  const [slice, setSlice] = React.useState([0, 35]);

  const [data, setData] = React.useState([]);

  const [dataPromise, setDataPromise] = React.useState(null);

  React.useEffect(() => {
    const data_inner = makeData(100000);

    setDataPromise((d) => {
      if (d && !d.isCanceled) {
        d.cancel();
      }

      return new PCancelable((resolve, reject, onCancel) => {
        const timeout = setTimeout(() => {
          resolve(
            data_inner
              .fill({ loading: true }, slice[0] + slice[1], 100000)
              .slice(0, 100000)
          );
        }, 250);

        onCancel(() => {
          clearTimeout(timeout);
        });
      });
    });
  }, [slice]);

  React.useEffect(() => {
    (async () => {
      if (dataPromise) {
        try {
          setData(await dataPromise);
        } catch {}
      }
    })();
  }, [dataPromise]);

  return (
    <Styles>
      <Table
        columns={columns}
        data={data}
        onFetchData={(start, end) => {
          setSlice([start, end]);
        }}
      />
    </Styles>
  );
}

export default App;
