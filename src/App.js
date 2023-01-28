/* ===================================================================== 
if you're reading this, i apologise for the mess
did not plan for it to be readable, nor structured in any "best practice way"
code just evolved as things were figured out, and patched up to work properly for a fun little webpage :)
===================================================================== */

import { ethers } from "ethers";
import { useState, useEffect, useRef } from "react";
import DataTable from "react-data-table-component";
import { BarLoader } from "react-spinners";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import format from "date-fns/format";

const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const rocketStorageAddress = "0x1d8f8f00cfa6758d7bE78336684788Fb0ee0Fa46";
const spotPriceAddress = "0x07D91f5fb9Bf7798734C3f606dB065549F6893bb";
const usdcAddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const arbContractAddress = "0x1f7e55F2e907dDce8074b916f94F62C7e8A18571";
const citrusArbContractAddress = "0xE46BFe6F559041cc1323dB3503a09c49fb5d8828";
const API_KEY = process.env.REACT_APP_ETHERSCAN_API_KEY;

const provider = new ethers.providers.JsonRpcProvider(`https://mainnet.infura.io/v3/${process.env.REACT_APP_INFURA_API_KEY}`);

const etherScanLink = (id) => {
  const url = id.length > 43 ? `https://etherscan.io/tx/${id}` : `https://rocketscan.io/node/${id}`;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      {id.substring(0, 8)}...{id.substring(id.length - 6)}
    </a>
  );
};

const etherScanNodeFilter = (id) => {
  const url = `https://etherscan.io/address/0x1f7e55f2e907ddce8074b916f94f62c7e8a18571?fromaddress=${id}`;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      {id}
    </a>
  );
};

const dataTableCols = [
  {
    name: "ID",
    selector: (row) => row.id,
    sortable: true,
    compact: true,
    maxWidth: "15px",
  },
  {
    name: "Local Time",
    selector: (row) => format(row.time, "yyyy-MM-dd HH:mm"),
    sortable: true,
    compact: true,
    defaultSortAsc: false,
    sortFunction: (rowa, rowb) => {
      return rowa.time > rowb.time ? 1 : -1;
    },
  },
  {
    name: "Tx ID",
    selector: (row) => etherScanLink(row.hash),
    sortable: true,
    compact: true,
    center: true,
  },
  {
    name: "Node",
    selector: (row) => etherScanLink(row.to),
    sortable: true,
    compact: true,
    center: true,
  },
  {
    name: "Net Profit (ETH)",
    selector: (row) => roundNum(row.netProfit, 5),
    sortable: true,
    compact: true,
    right: true,
    maxWidth: "125px",
  },
  {
    name: "Tx Fee (ETH)",
    selector: (row) => roundNum(row.txFee, 5),
    sortable: true,
    compact: true,
    right: true,
    maxWidth: "125px",
  },
  {
    name: "Gas Used (gas)",
    selector: (row) => Math.round(row.gasUsed),
    sortable: true,
    compact: true,
    right: true,
    maxWidth: "125px",
  },
  {
    name: "Gas Price (gwei)",
    selector: (row) => Math.round(row.gasPrice / 1e9),
    sortable: true,
    compact: true,
    right: true,
    maxWidth: "125px",
  },
];

const StatCard = (title, text) => {
  return (
    <div key={title} className="btn btn-sm btn-light h-100" style={{ width: "200px" }}>
      <div className="">
        <span className="fw-bold">{title}</span>:<br></br> {text}
      </div>
    </div>
  );
};

const latestTxs = (txs, top) => {
  let data = txs.slice(0, top);
  return data;
};

const roundNum = (num, dec) => {
  return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
};

const avgStats = (txs) => {
  let stats = {
    "Avg Net Profit (ETH)": roundNum(txs.map((tx) => tx.netProfit - tx.txFee).reduce((a, b) => a + b, 0) / txs.length, 5),
    "Avg Fee (ETH)": roundNum(txs.map((tx) => tx.txFee).reduce((a, b) => a + b, 0) / txs.length, 5),
    "Avg Gas (gas)": Math.floor(txs.map((tx) => tx.gasUsed).reduce((a, b) => a + b, 0) / txs.length),
  };
  return stats;
};

const leaderStats = (txs) => {
  txs = txs.map((tx) => [tx.time, tx.hash, tx.to, tx.netProfit, tx.txFee]);

  let bigArb = txs.sort((a, b) => (a[3] < b[3] ? 1 : -1))[0];
  let bigFee = txs.sort((a, b) => (a[4] < b[4] ? 1 : -1))[0];
  let totalArbProfits = txs.reduce((a, b) => a + Number(b[3]), 0);
  let mostProfitableNode = txs.reduce((prev, curr) => ({ ...prev, [curr[2]]: (prev[curr[2]] ? prev[curr[2]] : 0) + curr[3] }), {});
  mostProfitableNode = Object.entries(mostProfitableNode).sort((a, b) => (a[1] < b[1] ? 1 : -1))[0];
  return {
    biggestArb: bigArb,
    biggestFee: bigFee,
    mostProfitableNode: mostProfitableNode,
    totalArbProfits: totalArbProfits,
  };
};

const chartDefaultOptions = {
  chart: {
    type: "spline",
    zoomType: "x",
  },
  accessibility: {
    enabled: false,
  },
  title: {
    text: null,
  },
  xAxis: {
    type: "datetime",
  },
  yAxis: {
    title: {
      text: "Profit",
    },
    labels: {
      format: "{value} ETH",
    },
  },
  legend: {
    enabled: false,
  },
  plotOptions: {
    series: {
      marker: {
        enabled: true,
        radius: 4,
        color: "blue",
        symbol: "circle",
        states: {
          hover: {
            enabled: true,
            lineColor: "rgb(0,0,0)",
          },
        },
      },
      lineWidth: "0",
      states: {
        hover: {
          marker: {
            enabled: false,
          },
        },
      },
    },
  },
};

// --------------------------------------------------------------------------------------------------------------------------------------------

// app() starts below

// --------------------------------------------------------------------------------------------------------------------------------------------

function App() {
  const [pageNav, setPageNav] = useState(0);

  const [currentArbData, setCurrentArbData] = useState([]);
  const [leaderboardStats, setLeaderboardStats] = useState({});
  const [arbTransactions, setArbTransactions] = useState([]);
  const [arbTransactionStats, setArbTransactionStats] = useState([]);
  const [chartOptions, setChartOptions] = useState(chartDefaultOptions);

  const chartComponent = useRef();

  useEffect(() => {
    const chart = chartComponent.current?.chart;
    if (chart) {
      chart.redraw();
    }
  }, []);

  const updateChartData = (txs) => {
    let chartData = txs.map((tx) => [tx.time.getTime(), tx.netProfit]);
    chartData = {
      name: "Net Profit from Arb (ETH)",
      type: "spline",
      data: chartData,
      tooltip: {
        followPointer: false,
        pointFormat: "{point.y:.4f} ETH",
      },
    };

    let d = chartDefaultOptions;
    d.series = [chartData];
    return d;
  };

  const getLatestArbs = async () => {
    const txInternal = await fetch(`https://api.etherscan.io/api?module=account&action=txlistinternal&address=${arbContractAddress}&sort=asc&apikey=${API_KEY}`);
    const txNormal = await fetch(`https://api.etherscan.io/api?module=account&action=txlist&address=${arbContractAddress}&sort=asc&apikey=${API_KEY}`);

    let txProfits = await txInternal.json();
    let txGas = await txNormal.json();

    txProfits = txProfits.result;
    txGas = txGas.result;

    // get new arbs from citrus contract // NEEDS A REFACTOR THIS IS LAZY
    let txCitrusInternal = await fetch(`https://api.etherscan.io/api?module=account&action=txlistinternal&address=${citrusArbContractAddress}&sort=asc&apikey=${API_KEY}`);
    let txCitrusNormal = await fetch(`https://api.etherscan.io/api?module=account&action=txlist&address=${citrusArbContractAddress}&sort=asc&apikey=${API_KEY}`);
    txCitrusInternal = await txCitrusInternal.json();
    txCitrusNormal = await txCitrusNormal.json();
    txProfits = [...txProfits, ...txCitrusInternal.result];
    txGas = [...txGas, ...txCitrusNormal.result];

    txProfits = txProfits
      .filter((x) => x.traceId === "0_1" && x.gasUsed === "0")
      .map((x) => {
        let { hash, to, value } = x;
        const tx = txGas.find((tx) => tx.hash === hash);
        let { gasUsed, gasPrice, timeStamp } = tx;
        gasUsed = Number(gasUsed);
        let txFee = (gasUsed * gasPrice) / 1e18;
        let netProfit = value / 1e18 - txFee;
        let time = new Date(parseInt(timeStamp) * 1000);
        return { time, hash, to, netProfit, txFee, gasUsed, gasPrice };
      })
      .sort((a, b) => (a.time > b.time ? 1 : -1))
      .map((x, idx) => {
        return { ...x, id: idx + 1 };
      })
      .sort((a, b) => (a.time < b.time ? 1 : -1));

    setChartOptions(updateChartData(txProfits));
    setLeaderboardStats(leaderStats(txProfits));
    setArbTransactions(txProfits);
    setArbTransactionStats(avgStats(latestTxs(txProfits, 10)));
  };

  // useEffect(() => {
  //   const getTransactions = async () => {
  //     let url = "https://55h2grgmguatyxkrc4blmyupvm0htdru.lambda-url.us-east-1.on.aws/";
  //     try {
  //       let docs = await fetch(url);
  //       docs = await docs.json();
  //       setArbTransactionsv2(docs);
  //     } catch (e) {
  //       console.log(e);
  //     }
  //   };
  //   getTransactions();
  // }, []);

  const getCurrentArbData = async () => {
    const getSecondaryRate = async (fromAddr, toAddr, amount, protocols = []) => {
      const quoteParams = {
        fromTokenAddress: fromAddr,
        toTokenAddress: toAddr,
        amount: amount,
      };
      if (protocols.length > 0) {
        quoteParams["protocols"] = protocols.join(",");
      }
      const queryString = new URLSearchParams(quoteParams).toString();
      const url = `https://api.1inch.io/v5.0/1/quote?${queryString}`;
      const res = await fetch(url);
      const resData = await res.json();
      return ethers.BigNumber.from(resData.toTokenAmount);
    };

    const rocketStorage = new ethers.Contract(rocketStorageAddress, ["function getAddress(bytes32 key) view returns (address)"], provider);
    const rethAddress = await rocketStorage.getAddress(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("contract.addressrocketTokenRETH")));
    const rethContract = new ethers.Contract(rethAddress, ["function getRethValue(uint256 ethAmount) view returns (uint256)", "function getExchangeRate() view returns (uint256)", "function approve(address spender, uint256 amount) nonpayable returns (bool)"], provider);

    // const rocketDepositSettingsAddress = await rocketStorage.getAddress(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("contract.addressrocketDAOProtocolSettingsDeposit")));
    // const depositSettings = new ethers.Contract(rocketDepositSettingsAddress, ["function getDepositFee() view returns (uint256)", "function getMaximumDepositPoolSize() view returns (uint256)"], provider);
    // const dpFee = await depositSettings.getDepositFee();

    const primaryRate = await rethContract.getExchangeRate();
    const secondaryRate = await getSecondaryRate(rethAddress, wethAddress, ethers.utils.parseUnits("1", "ether").toString());
    const percentage = ethers.utils.formatUnits(primaryRate.sub(secondaryRate).abs().mul("100").mul("1000").div(primaryRate), 3);
    const direction = primaryRate.lte(secondaryRate) ? "premium" : "discount";
    const rateToString = (r) => ethers.utils.formatUnits(r.sub(r.mod(1e12)));

    const spotPriceContractUSDC = new ethers.Contract(spotPriceAddress, ["function getRate(address, address, bool) view returns (uint256)"], provider);
    let secondaryRateUSDC = await getSecondaryRate(usdcAddress, wethAddress, 1000, ["UNISWAP_V2", "UNISWAP_V3"]); /// force uniswap, some dexes have odd prices, looking at you DXSWAP!
    secondaryRateUSDC = (1 / ethers.utils.formatUnits(secondaryRateUSDC, 6)) * 1e9;

    // hard coding the deposit fee, and swap fees, to save on API calls (yes very stingy, they don't change much anyway)
    const primaryRateNumber = ethers.utils.formatUnits(primaryRate);
    const secondaryRateNumber = ethers.utils.formatUnits(secondaryRate);
    const swapRate = secondaryRateNumber / primaryRateNumber;
    const depositFeeMult = 0.9995;
    const swapFeeMult = 0.9995;

    const grossProfit = 16 * depositFeeMult * swapRate * swapFeeMult - 16; // 16 * (1-deposit_fee) * premium * (1-swap_fee)
    const gasCost = arbTransactionStats["Avg Fee (ETH)"] || ethers.utils.formatUnits(Math.ceil(12 * 700000), "gwei"); // average fee of last 10 tx, or 12gwei/gas * 700,000 gas
    const netProfit = Math.floor((grossProfit - gasCost) * 1e5) / 1e5;
    const netProfitUSDC = Math.round(secondaryRateUSDC * netProfit * 100) / 100;

    const d = {
      "rETH protocol rate (ETH)": rateToString(primaryRate),
      "rETH market rate (ETH)": rateToString(secondaryRate),
      "Premium/discount": Number(percentage) + "% " + direction,
      "ETH price (USDC)": Math.round(secondaryRateUSDC * 100) / 100,
      "Potential net profit (ETH)": netProfit,
      "Potential net profit (USDC)": netProfitUSDC,
    };

    setCurrentArbData(d);
  };

  useEffect(() => {
    getCurrentArbData();
    getLatestArbs();
    return;
  }, []);

  const pageStats = () => {
    return (
      <>
        <div className="container">
          <div className="row mt-3">
            <h3 className="mb-5 text-center">
              🛠 Current Market Stats{" "}
              <i
                className="mx-2 fa fa-refresh text-success"
                onClick={() => {
                  setCurrentArbData([]);
                  getCurrentArbData();
                }}
              ></i>
            </h3>
            <div className="d-flex flex-row gap-3 justify-content-evenly align-items-center">
              {currentArbData.length === 0 ? (
                <div className="d-flex flex-row gap-3 align-items-center">
                  <BarLoader />
                  <span> Getting current arb market data...</span>
                </div>
              ) : (
                Object.entries(currentArbData).map(([k, v]) => StatCard(k, v))
              )}
            </div>
          </div>
        </div>
        <div className="container">
          <div className="row mt-5">
            <div className="col d-flex justify-content-center flex-column">
              <h3 className="text-center mb-4"> 🥇 Leaderboard</h3>
              {Object.keys(leaderboardStats).length === 0 ? (
                <div className="d-flex flex-row gap-3 justify-content-center align-items-center">
                  <BarLoader /> <span> Loading leaderboard stats...</span>
                </div>
              ) : (
                <div className="col">
                  <div className="d-flex">
                    <table className="table table-sm table-hover w-auto" style={{ minWidth: "600px", margin: "0 auto", borderTop: "1px solid #F0F0F0" }}>
                      <thead className="bg-light">
                        <tr>
                          <th></th>
                          <th className="text-center">Tx Time</th>
                          <th className="text-center">Node/Tx ID</th>
                          <th className="text-end">Value (ETH)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="align-middle">
                          <td>
                            <b>Fattest Arb Tx (net)</b>
                          </td>
                          <td className="text-center">{format(leaderboardStats["biggestArb"][0], "yyyy-MM-dd hh:mm")}</td>
                          <td className="text-start ps-3">
                            {etherScanLink(leaderboardStats["biggestArb"][2])} (Node)
                            <br></br>
                            {etherScanLink(leaderboardStats["biggestArb"][1])} (Tx)
                          </td>
                          <td className="text-end">{roundNum(leaderboardStats["biggestArb"][3], 5)}</td>
                        </tr>
                        <tr className="align-middle">
                          <td>
                            <b>Biggest Tx Fee</b>
                          </td>
                          <td className="text-center">{format(leaderboardStats["biggestFee"][0], "yyyy-MM-dd hh:mm")}</td>
                          <td className="text-start ps-3">
                            {etherScanLink(leaderboardStats["biggestFee"][2])} (Node)
                            <br></br>
                            {etherScanLink(leaderboardStats["biggestFee"][1])} (Tx)
                          </td>
                          <td className="text-end">{roundNum(leaderboardStats["biggestFee"][4], 5)}</td>
                        </tr>
                        <tr className="align-middle">
                          <td>
                            <b>Most Arb Profits</b>
                          </td>
                          <td className="text-center"></td>
                          <td className="text-start ps-3">{etherScanLink(leaderboardStats["mostProfitableNode"][0])} (Node)</td>
                          <td className="text-end">{roundNum(leaderboardStats["mostProfitableNode"][1], 5)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="container">
          <div className="row mt-5">
            <div className="col mb-5 text-center">
              <h3 className="text-center mb-4"> 💲 Latest Arbs</h3>
              {arbTransactions.length === 0 ? (
                <div className="d-flex flex-row gap-3 justify-content-center align-items-center">
                  <BarLoader /> <span> Getting latest arb transactions...</span>
                </div>
              ) : (
                <div>
                  <div className="d-flex flex-row gap-3 justify-content-center align-items-center">
                    <div className="btn btn-sm gold-total-arb my-3" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Thank you ramana.eth!">
                      <b>Total Node Operator Arb Profits: {roundNum(leaderboardStats["totalArbProfits"], 3)} ETH</b>
                    </div>

                    <span>
                      <b>Last 10 transactions:</b>
                    </span>
                    {Object.entries(arbTransactionStats).map(([k, v]) => {
                      return (
                        <div key={k} className="btn btn-sm btn-light">
                          {k + ": " + v}
                        </div>
                      );
                    })}
                  </div>

                  <div className="my-3">
                    <HighchartsReact ref={chartComponent} highcharts={Highcharts} options={chartOptions} />
                  </div>
                  <div className="small">
                    <i>Note: arb transactions using --no-flash-loan are not counted in this dataset. Currently they are about 1-2% of all arb txns.</i>
                  </div>

                  <DataTable className="w-auto" columns={dataTableCols} data={arbTransactions} keyField="Tx ID" dense striped highlightOnHover pagination></DataTable>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  };

  const pageInfo = () => {
    return (
      <div className="container">
        <div className="row mt-3">
          <div className="col">
            <h2 className="mb-3">Assumptions</h2>
            <p>Deposit transaction gas cost is ignored as this page is assessing the benefit of the arbitrage transaction vs not doing an arbitrage transaction when creating a minipool.</p>
            <p>i.e. "Tx fee" only accounts for arbitrage transaction gas cost, i.e. to highlight the cost of arbitrage vs no-arbitrage tx</p>
            <hr />
            <ul>
              <li>Fattest arb tx = the most net profit any node operator has achieved in a single deposit arb transaction</li>
              <li>Biggest tx fee = the most a node operator has paid for executing the arb tx</li>
              <li>Most arb profits = the node operator with the highest cumulative sum of net profits from arb transactions</li>
              <li>Total node operator arb profits = the sum of net profits of all arb transactions</li>
            </ul>
            <hr />
            <ul>
              <li>rETH protocol rate = RP smart contract rate</li>
              <li>rETH market rate = 1inch smart contract rate</li>
              <li>premium/discount = rETH market rate / rETH protocol rate</li>
              <li>ETH price USDC = 1inch smart contract rate</li>
              <li>Potential net profit (ETH) = 16 ETH * (1 - 0.05% deposit fee) * %premium * (1 - 0.05% swap fee estimate) - arb gas cost (avg from recent 10 tx) </li>
              <li>Potential net profit (USDC) = Potential net profit (ETH) * ETH price (USDC)</li>
            </ul>
            <hr />
            <ul>
              <li>Note: Currently stats do not count arbs using --no-flash-loan option</li>
              <ul>
                <li>This caveat has little effect since only 1-2% arbs are not using flash loan</li>
              </ul>
            </ul>
          </div>
        </div>
        <div className="row mt-3">
          <div className="col">
            <h2 className="mb-3">Special thanks</h2>
            <ul>
              <li>
                <span>
                  Special thanks to{" "}
                  <a href="https://etherscan.io/address/ramana.eth" target="_blank" rel="noreferrer">
                    Ramana.eth
                  </a>{" "}
                  for creating the{" "}
                  <a href="https://github.com/xrchz/rocketarb/" target="_blank" rel="noreferrer">
                    rocketarb scripts <i className="fa-brands fa-github"></i>
                  </a>
                </span>
              </li>
              <li>
                {" "}
                Rocketpool core team for the protocol{" "}
                <a href="http://rocketpool.net" target="_blank" rel="noreferrer">
                  rocketpool.net
                </a>
              </li>
              <li>
                {" "}
                Rocketpool community for being awesome{" "}
                <a href="https://discord.gg/rocketpool" target="_blank" rel="noreferrer">
                  <i className="fa-brands fa-discord"></i>
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="row mt-3 d-none">
          <div className="col">
            <h2 className="mb-3">Todo</h2>
            <ul className="text-danger">
              <li>Include --no-flash-loan transaction bundles in stats</li>
              <li>Post source code for page on github</li>
              <li>Show stat count of minipools using rocketarb script "total number of uses"</li>
              <li className="text-decoration-line-through">Add index of ids to tx table</li>
              <li className="text-decoration-line-through">Add transaction time to tx table</li>
              <li className="text-decoration-line-through">Show gas price of successful tx's</li>
              <li className="text-decoration-line-through">Paginate table</li>
              <li className="text-decoration-line-through">Stop mobile display rendering like a dog's breakfast</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const getPage = (n) => {
    let pages = {
      0: pageStats(),
      1: pageInfo(),
    };
    return pages[n];
  };

  return (
    <div className="page">
      <div className="p-3 d-flex flex-row justify-content-between align-items-center" style={{ backgroundColor: "rgb(249 115 22)" }}>
        <div className="d-flex flex-row justify-content-between align-items-center gap-3">
          <img src="https://raw.githubusercontent.com/rocket-pool/rocketpool/master/images/logo.png" style={{ height: "40px" }} className="logo-text" alt=""></img>
          <h2 className="fw-bold p-0 m-0 logo-text">RocketArb Watch</h2>
        </div>
        <a className="btn btn-danger text-nowrap glow" title="This RocketArb-Watch page will be decomissioned in future" href="https://rocketscan.io/rocketarb/" target="_blank" rel="noreferrer">
          Use RocketScan.io/rocketarb!
        </a>
        <div className="d-flex flex-row gap-3">
          <a className="btn btn-sm btn-light text-nowrap" href="https://github.com/xrchz/rocketarb/" target="_blank" rel="noreferrer">
            <i className="fa-brands fa-github"></i> RocketArb by Ramana.eth
          </a>
          <div className="btn-group">
            <button className="btn btn-sm btn-outline-light dropdown-toggle" type="button" data-bs-toggle="dropdown">
              0xHodja.eth
            </button>
            <ul className="dropdown-menu p-1" style={{ minWidth: "100px" }}>
              <li>
                <a href="https://twitter.com/hodjatweet" className="dropdown-item small" target="_blank" rel="noreferrer">
                  <i className="fa-brands fa-twitter text-primary"></i> Twitter
                </a>
              </li>
              <li>
                <a href="https://etherscan.io/address/0xhodja.eth" className="dropdown-item small" target="_blank" rel="noreferrer">
                  <i className="fa fa-coffee text-primary"></i> Tip
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="p-2 d-flex flex-row justify-content-center align-items-center bg-light">
        <div className="d-flex flex-row justify-content-center align-items-center gap-3">
          <a className={`btn btn-sm text-nowrap ${pageNav == 0 ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setPageNav(0)} style={{ width: "100px" }}>
            Stats
          </a>
          <a className={`btn btn-sm text-nowrap ${pageNav == 1 ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setPageNav(1)} style={{ width: "100px" }}>
            Page Info
          </a>
        </div>
      </div>
      {getPage(pageNav)}
    </div>
  );
}

export default App;
