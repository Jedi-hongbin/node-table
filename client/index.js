const baseURL = "http://159.75.22.82:80/";
// const baseURL = "http://localhost/";
//key: 所有表 value 表的所有字段组成的数组
const TableFields = {};
const PhotoFields = ["logo", "photo"];

function init() {
  getTableList();
}
//就进入需要执行的操作
init();

function handleInsertDataTableListen() {
  handleMouseEventListen();
  handleRadioChangeListen();
}

//表格移入移出监听
function handleMouseEventListen() {
  $(".insertData").on("mouseenter", () => {
    mouseAnimate("enter");
  });

  $(".insertData").on("mouseleave", () => {
    const haveOperation = $("input[type=radio][name=tableRadio]").is(
      ":checked"
    );
    // 如果没有操作就移出
    if (!haveOperation) {
      mouseAnimate("leave");
    }
  });
}

function mouseAnimate(status) {
  let transform = "translateX(0)";
  let width = "100%";
  if (status == "leave") {
    transform = "translateX(50%)";
    width = "6rem";
  }
  $(".insertData").css({ transform });
  $(".insertData").children(".title").animate({ width }, 300);
}

function handleRadioChangeListen() {
  $("input[type=radio][name=tableRadio]").change(function () {
    //有选择的时候出现表单
    $(".insertData").animate({ height: "30rem" }, 200);
    $("#insertDataForm").css("display", "flex").show();
    const tableName = this.value;
    renderTables(tableName);
  });
}
//渲染右侧添加数据表单
function renderTables(tableName) {
  const fields = TableFields[tableName];
  const tables = fields.map(generateTableInputItem);
  const insertDataTable = document.getElementById("insertDataTable");
  insertDataTable.innerHTML = `${tables.join(" ")}`;
}
//生成添加数据表单的input
function generateTableInputItem({ COLUMN_NAME, DATA_TYPE }) {
  if (COLUMN_NAME == "id") return;
  //TODO 待处理更多类型
  if (DATA_TYPE == "char" || DATA_TYPE == "int") {
    const inputType = DATA_TYPE == "char" ? "text" : "number";
    return `<div class="inputWrap">
              <p>${COLUMN_NAME}</p>
              <input name=${COLUMN_NAME} type="${inputType}" class="input" />
            </div>`;
  }
}

function handleExitTableInsert() {
  //取消radio选中
  const selector = "input[type=radio][name=tableRadio]:checked";
  const checkedRadio = document.querySelector(selector);
  checkedRadio.checked = false;
  //表格缩小
  $(".insertData").animate({ height: "8rem" }, 200, () => {
    $("#insertDataForm").hide();
  });
  // 窗口移回
  mouseAnimate("leave");
  clearTableContent();
}
function clearTableContent() {
  //数据清理
  $("#insertDataTable")
    .children()
    .each((_, e) => {
      const input = e.querySelector("input");
      input.value = "";
    });
}
$("#insertDataForm").on("submit", handleInsertData);
$("#insertDataForm").on("reset", handleResetData);

function handleResetData() {
  //   $(".insertDataTableWrap").hide();
}

//插入数据
function handleInsertData(e) {
  e.preventDefault();
  const tableName = $("input[type=radio][name=tableRadio]:checked").val();
  console.log(tableName);
  const data = { tableName };
  $("#insertDataTable")
    .children()
    .each((_, e) => {
      const input = e.querySelector("input");
      const key = input.name;
      const value = input.value;
      if (value) data[key] = value;
    });

  post("insertInto", data)
    .then((res) => {
      console.log("res", res);
      clearTableContent();
      //左侧表格刷新
      refreshTable(tableName);
    })
    .catch((err) => {
      console.log("err", err);
    });
}

function verifyFieldCanBeUpdated(DATA_TYPE) {
  if (DATA_TYPE == "int" || DATA_TYPE == "char") {
    return true;
  }
}

const fileInputStatus = (input, status) => {
  input.setAttribute("status", status);
};

const showFileInput = (input) => {
  fileInputStatus(input, "show");
};

const hideFileInput = (input) => {
  fileInputStatus(input, "hide");
};

//开启修改数据
function handleEditData(tableName, e) {
  const optionWrap = e.parentNode;
  const tr = optionWrap.parentNode.parentNode;
  const tdList = Array.from(tr.children);
  //ID 和 按钮不用修改
  tdList.pop();
  tdList.shift();

  tdList.forEach((td, index) => {
    const { COLUMN_NAME, DATA_TYPE } = TableFields[tableName][index + 1];
    if (verifyFieldCanBeUpdated(DATA_TYPE)) {
      const prevData = td.innerHTML;
      const input = `<input class="editInput" prev-data="${prevData}" name="${COLUMN_NAME}" type="text" value="${prevData}" />`;
      td.innerHTML = input;
    }
    //图片TD
    if (td.getAttribute("image-wrap") != null) {
      showFileInput(td.children[0]);
    }
  });
  //功能按钮变成确认和返回
  optionWrap.innerHTML = generateOptionTDButton("edit", tableName);
}

function handleDeleteData(tableName, id, e) {
  console.log(tableName, id);
  const confirmed = confirm("确定删除");
  if (confirmed) {
    post("delete", { id, tableName })
      .then((res) => {
        console.log("res", res);
        //本地删除
        const tr = e.parentNode.parentNode.parentNode;
        tr.parentNode.removeChild(tr);
      })
      .catch((err) => {
        console.log("err", err);
      });
  }
}

function verifyTextOrNumInput({ nodeName, type }) {
  return nodeName == "INPUT" && (type === "text" || type === "number");
}

//保存更改 修改数据
function handleSaveChange(tableName, e) {
  const optionWrap = e.parentNode;
  const tr = optionWrap.parentNode.parentNode;
  const tdList = Array.from(tr.children);
  const id = tdList[0].innerHTML;
  //第一项id和最后一个功能按钮删除
  tdList.pop();
  tdList.shift();

  const changeData = { tableName, id }; //更改了哪些数据
  tdList.forEach((td) => {
    const input = td.firstChild;

    if (verifyTextOrNumInput(input)) {
      const prevData = input.getAttribute("prev-data");
      const currData = input.value;

      if (prevData != currData) {
        const field = input.name;
        changeData[field] = currData;
      }
    }
    //上传图片td
    else if (input.type === "file") {
      //查看data-temp是否有数据 有则直接上传该值
      const field = td.children[0].name;
      const base64 = td.children[1].src;
      if (base64) changeData[field] = base64;
    }
  });
  console.log(changeData);

  //发送请求修改数据
  post("update", changeData)
    .then((res) => {
      console.log("res", res);
      //功能按钮变回编辑和删除
      optionWrap.innerHTML = generateOptionTDButton("normal", tableName, id);
      //td退出编辑状态
      tdList.forEach((td) => {
        const { firstChild: input } = td;
        const { value, type } = input;

        if (verifyTextOrNumInput(input)) {
          td.innerHTML = value;
        } else if (type == "file") {
          //隐藏input file选择器
          hideFileInput(input);
        }
      });
    })
    .catch((err) => {
      console.log("err", err);
    });
}
//退出编辑状态 还原以前的数据
function handleExitEditStatus(tableName, e) {
  const optionWrap = e.parentNode;
  const tr = optionWrap.parentNode.parentNode;

  const tdList = Array.from(tr.children).filter(
    (td) => td.firstChild.nodeName == "INPUT"
  );

  const id = tr.children[0].innerHTML;
  optionWrap.innerHTML = generateOptionTDButton("normal", tableName, id);

  tdList.forEach((td) => {
    const { firstChild: input } = td;

    if (verifyTextOrNumInput(input)) {
      const prevData = input.getAttribute("prev-data");
      td.innerHTML = prevData;
    } else if (input.type == "file") {
      //隐藏input file选择器
      hideFileInput(input);
      //清除temp的src
      input.nextElementSibling.src = "";
    }
  });
}

async function get(path, params) {
  let paramsStr = "";

  if (params) {
    paramsStr = "?";
    for (const [key, value] of Object.entries(params)) {
      paramsStr += `${key}=${value}&`;
    }
    paramsStr = paramsStr.substring(0, paramsStr.length - 1);
  }

  const URL = baseURL + path + paramsStr;
  const request = await fetch(URL);
  return request.json();
}

async function post(path, data) {
  // const body = new FormData();

  // for (const [key, value] of Object.entries(data)) {
  //   body.append(key, value);
  // }

  const URL = baseURL + path;

  const option = {
    method: "post",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  };

  const request = await fetch(URL, option);
  return request.json();
}

function getTableList() {
  get("showTables")
    .then((tables) => {
      renderTableList(tables);
      //决定有几个可选的表可添加 右侧添加数据表单
      renderTableRadio(tables);
    })
    .catch((err) => {
      console.log("err", err);
    });
}

function generateOptionTDButton(type, tableName, id) {
  if (type == "edit") {
    return `
      <svg onclick="handleSaveChange('${tableName}',this)" class="pointerIcon" t="1617924834184" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5508" width="16" height="16"><path d="M512 512m-448 0a448 448 0 1 0 896 0 448 448 0 1 0-896 0Z" fill="#4CAF50" p-id="5509"></path><path d="M738.133333 311.466667L448 601.6l-119.466667-119.466667-59.733333 59.733334 179.2 179.2 349.866667-349.866667z" fill="#CCFF90" p-id="5510"></path></svg>
      <svg onclick="handleExitEditStatus('${tableName}',this)" class="pointerIcon" t="1617924915249" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="6885" width="16" height="16"><path d="M55.466667 448l288 166.4c44.8 25.6 100.266667-6.4 89.6-57.6V224c10.666667-51.2-44.8-83.2-89.6-57.6L55.466667 332.8c-42.666667 25.6-42.666667 89.6 0 115.2z" fill="#24AA7D" p-id="6886"></path><path d="M900.266667 435.2c78.933333 128 51.2 258.133333-29.866667 339.2-46.933333 46.933333-110.933333 74.666667-181.333333 74.666667H490.666667c-32 0-57.6-25.6-57.6-57.6 0-32 25.6-55.466667 55.466666-55.466667h196.266667c40.533333 0 74.666667-17.066667 100.266667-42.666667 49.066667-49.066667 61.866667-132.266667 0-206.933333-17.066667-21.333333-53.333333-36.266667-81.066667-36.266667H430.933333v-115.2h281.6c76.8 0 149.333333 36.266667 187.733334 100.266667z" fill="#24AA7D" p-id="6887"></path></svg>
    `;
  }
  const normal = `
    <svg onclick="handleEditData('${tableName}',this)" t="1617921971919" class="pointerIcon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4692" width="16" height="16"><path d="M685.329 195.952L210.857 670.424a88.386 88.386 0 0 0-25.735 57.309l-4.671 79.411v2.076c0.573 9.746 8.939 17.182 18.685 16.609l79.411-4.671a88.39 88.39 0 0 0 57.309-25.735l474.47-474.473c34.518-34.517 34.518-90.481 0-124.998-34.516-34.517-90.48-34.517-124.997 0z m199.996-74.999c75.938 75.938 75.938 199.058 0 274.996L410.853 870.421a194.453 194.453 0 0 1-126.079 56.618l-79.411 4.671c-68.223 4.013-126.781-48.039-130.794-116.262a123.62 123.62 0 0 1 0-14.533l4.671-79.411a194.453 194.453 0 0 1 56.618-126.079L610.33 120.953c75.938-75.937 199.057-75.937 274.995 0z m11.287 732.983c29.289 0 53.032 23.743 53.032 53.032S925.901 960 896.612 960H543.065c-29.289 0-53.032-23.743-53.032-53.032s23.743-53.032 53.032-53.032h353.547z" p-id="4693" fill="#13227a"></path></svg>
    <svg onclick="handleDeleteData('${tableName}','${id}',this)" t="1617921897796"  class="pointerIcon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3735" width="16" height="16"><path d="M896 196.923077H649.846154V118.153846c0-43.323077-35.446154-78.769231-78.769231-78.769231h-118.153846c-43.323077 0-78.769231 35.446154-78.769231 78.769231v78.769231H128c-15.753846 0-29.538462 13.784615-29.538462 29.538461v59.076924c0 15.753846 13.784615 29.538462 29.538462 29.538461h768c15.753846 0 29.538462-13.784615 29.538462-29.538461v-59.076924c0-15.753846-13.784615-29.538462-29.538462-29.538461zM452.923077 137.846154c0-11.815385 7.876923-19.692308 19.692308-19.692308h78.76923c11.815385 0 19.692308 7.876923 19.692308 19.692308v59.076923h-118.153846V137.846154z m364.307692 256h-610.461538c-15.753846 0-29.538462 13.784615-29.538462 29.538461V886.153846c0 55.138462 43.323077 98.461538 98.461539 98.461539h472.615384c55.138462 0 98.461538-43.323077 98.461539-98.461539V423.384615c0-15.753846-13.784615-29.538462-29.538462-29.538461zM452.923077 827.076923c0 11.815385-7.876923 19.692308-19.692308 19.692308h-39.384615c-11.815385 0-19.692308-7.876923-19.692308-19.692308V551.384615c0-11.815385 7.876923-19.692308 19.692308-19.692307h39.384615c11.815385 0 19.692308 7.876923 19.692308 19.692307v275.692308z m196.923077 0c0 11.815385-7.876923 19.692308-19.692308 19.692308h-39.384615c-11.815385 0-19.692308-7.876923-19.692308-19.692308V551.384615c0-11.815385 7.876923-19.692308 19.692308-19.692307h39.384615c11.815385 0 19.692308 7.876923 19.692308 19.692307v275.692308z" p-id="3736" fill="#13227a"></path></svg>
  `;
  return normal;
}

const generateTD = (tableName) => (value, index) => {
  value = value || "";
  //当前字段
  const field = TableFields[tableName][index].COLUMN_NAME;

  //如果该字段对应图片元素 生成img标签
  if (PhotoFields.includes(field))
    return `<td image-wrap><input name=${field} class="uploadInput" type="file" status="hide" onchange="uploadStoreLogo(this)"/>
      <img class="storeLogo" data-temp src="">
      <img class="storeLogo" data-prev src=${value}>
    </td>`;

  return `<td>${value}</td>`;
};

const uploadStoreLogo = (e) => {
  var reader = new FileReader();
  const img = e.parentNode.children[1];

  reader.onload = function (evt) {
    img.width = "150";
    img.height = "100";
    img.src = evt.target.result;
  };
  reader.readAsDataURL(e.files[0]);
};

//生成表格的html结构
function renderShowDataTable(tableName, tableData) {
  const table = `
    <table border="0" cellspacing="1" cellpadding="0">
      <thead>
        <tr>
          ${TableFields[tableName]
            .map((field) => `<th>${field.COLUMN_NAME}</th>`)
            .join(" ")}
          <th>Option</th>
        </tr>
      </thead>
      <tbody>
        ${tableData
          .map((data) => {
            const values = Object.values(data);
            return `<tr>
              ${values.map(generateTD(tableName)).join(" ")}
              <td>
                  <div  style="display:flex;justify-content:space-evenly;">
                    ${generateOptionTDButton("normal", tableName, data.id)}
                  </div>
                </td>
            </tr>`;
          })
          .join(" ")}
      </tbody>
    </table>
  </div>
  `;
  const tableContainer = document
    .querySelector(`li[tableName=${tableName}]`)
    .getElementsByClassName("tableContainer")[0];
  tableContainer.innerHTML = table;
}

function renderTableList(tables) {
  const TableList = document.getElementById("tableList");
  const tablesHTML = tables.map(generateTableItem);
  TableList.innerHTML = `<ul class="tableList">
      <div class="between-center">
      <p class="textShadow">show tables:</p>
      <svg class="pointerIcon" onclick="getTableList()" t="1617798493703" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2041" width="32" height="32"><path d="M394.2 767.5c-0.5-0.2-1-0.3-1.5-0.6-141.8-66.1-203.4-235.3-137.3-377.1 36.8-78.9 105.5-132.9 183.7-153.9L404 169.4c-91.9 29.3-171.8 95-215.7 189.1C105 537.3 182.6 750.6 361.4 834l1.5 0.6-46 98.6 230.8-49.8-110.3-208.7-43.2 92.8zM663.8 185.5l44-94.3L477 141l110.2 208.8 45.3-97.2c141.8 66.1 203.3 235.2 137.2 377-37.2 79.8-107.1 134.2-186.4 154.7l35.1 66.5c93-28.9 174.1-95 218.4-190 83.4-178.6 5.8-391.9-173-475.3z" p-id="2042"></path></svg>
      </div>
      ${tablesHTML.join(" ")}</ul>`;
  // 处理表格名字请求完毕的事务
  handleCreateTableShowData(tables);
}
//创建左侧每个表的数据展示表格
function handleCreateTableShowData(tables) {
  //同步获取每个表的字段
  tables.forEach((tableName) => {
    get("selectTableColumns", { tableName })
      .then(async (fields) => {
        //保存数据
        TableFields[tableName] = fields;
        //获取表格中的数据
        const tableData = await get("selectTable", { tableName });
        //渲染表的数据
        renderShowDataTable(tableName, tableData);
      })
      .catch((err) => {
        console.log("err", err);
      });
  });
  setTimeout(() => {
    console.log("TableFields", TableFields);
  }, 1000);
}

function generateTableItem(table) {
  return `
    <li tableName=${table} >
    <div class="justifyCenter">
      <span class="pointerIcon" title="get ${table} data" onclick="refreshTable('${table}')">${table}</span>
      <svg class="pointerIcon" onclick="refreshTable('${table}')" t="1617798493703" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2041" width="24" height="24"><path d="M394.2 767.5c-0.5-0.2-1-0.3-1.5-0.6-141.8-66.1-203.4-235.3-137.3-377.1 36.8-78.9 105.5-132.9 183.7-153.9L404 169.4c-91.9 29.3-171.8 95-215.7 189.1C105 537.3 182.6 750.6 361.4 834l1.5 0.6-46 98.6 230.8-49.8-110.3-208.7-43.2 92.8zM663.8 185.5l44-94.3L477 141l110.2 208.8 45.3-97.2c141.8 66.1 203.3 235.2 137.2 377-37.2 79.8-107.1 134.2-186.4 154.7l35.1 66.5c93-28.9 174.1-95 218.4-190 83.4-178.6 5.8-391.9-173-475.3z" p-id="2042"></path></svg>
    </div>
    <div class="tableContainer scroll-bar"></div>
    </li>
    `;
}

function refreshTable(tableName) {
  //获取表格中的数据
  get("selectTable", { tableName })
    .then((data) => {
      //渲染表的数据
      renderShowDataTable(tableName, data);
    })
    .catch((err) => {
      console.log("err", err);
    });
}

function renderTableRadio(tables) {
  const tableRadio = document.getElementById("tableRadio");
  const tablesRadioHTML = tables.map(generateTableRadioItem);
  tableRadio.innerHTML = tablesRadioHTML.join(" ");
  //添加监听
  handleInsertDataTableListen();
}

function generateTableRadioItem(table) {
  return `<label><input name="tableRadio" type="radio" value=${table} />${table} </label>`;
}

async function getTableData(tableName) {
  const tableData = await get("selectTable", { tableName });
  console.log(tableData);
}

function LinkGitHub() {
  window.open("https://github.com/Jedi-hongbin");
}
