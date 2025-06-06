// ============================
// データ構造＆順序配列
// ============================
let games = {};             // { "ゼルダの伝説": { status: "...", todos: [...], done: [...] }, ... }
let archives = {};          // { "ゼルダの伝説": ["タスク1", "タスク2"], ... }
let gameOrder = [];         // タイトルを並べ替えるための配列。localStorage から読み込む
let currentTab = "todo";    // "todo" または "storage"

// ============================
// 初回読み込み処理
// ============================
window.onload = () => {
  loadGames();      // games, gameOrder を localStorage から読み込む
  loadArchives();   // archives を localStorage から読み込む

  // タブ切り替え
  document.getElementById("tab-todo")
    .addEventListener("click", () => switchTab("todo"));
  document.getElementById("tab-storage")
    .addEventListener("click", () => switchTab("storage"));

  // ゲーム追加ボタン
  document.getElementById("addGameBtn")
    .addEventListener("click", () => {
      const input = document.getElementById("gameInput");
      const title = input.value.trim();
      if (!title) return;
      addGame(title);
      input.value = "";
    });

  // 全データリセットボタン
  document.getElementById("resetAllBtn")
    .addEventListener("click", () => {
      if (confirm("すべてのデータを削除しますか？")) {
        localStorage.removeItem("gamesData");
        localStorage.removeItem("archivesData");
        localStorage.removeItem("gameOrder");
        games = {};
        archives = {};
        gameOrder = [];
        currentTab = "todo";
        render();
      }
    });

  render();
};

function switchTab(tabName) {
  currentTab = tabName;
  document.getElementById("tab-todo").classList.toggle("active", tabName === "todo");
  document.getElementById("tab-storage").classList.toggle("active", tabName === "storage");
  document.getElementById("add-game-container").style.display = (tabName === "todo") ? "flex" : "none";
  render();
}

// ============================
// ゲーム追加
// ============================
function addGame(title) {
  if (!games[title]) {
    // 新しいゲームを登録
    games[title] = { status: "todo", lastUpdated: Date.now(), todos: [], done: [] };

    // gameOrder にも末尾追加
    gameOrder.push(title);
  } else {
    // 既存のタイトルが archve だった場合 → todo に戻す
    games[title].status = "todo";
    games[title].lastUpdated = Date.now();
    // すでに gameOrder にあれば何もしない
    // もし gameOrder になければ末尾追加
    if (!gameOrder.includes(title)) {
      gameOrder.push(title);
    }
  }
  saveAll();
  render();
}

// ============================
// ゲームをアーカイブに移動 (タイトル横の ✓ 完了)
// ============================
function archiveGame(title) {
  if (!games[title]) return;

  // ── 「games[title].todos」 が空 or undefined のときでも、
  //     archives[title] を空配列として作っておく
  const remainingTodos = games[title].todos || [];

  // archives[title] がまだなければ「空配列」で初期化
  if (!archives[title]) {
    archives[title] = [];
  }

  // もし残っているタスクがあれば、それもまとめて追加する
  remainingTodos.forEach(taskText => {
    if (!archives[title].includes(taskText)) {
      archives[title].push(taskText);
    }
  });

  // つづいて games[title] 自体を削除し、gameOrder からも外してしまう
  delete games[title];
  const idx = gameOrder.indexOf(title);
  if (idx >= 0) gameOrder.splice(idx, 1);

  // 保存＆再描画
  saveAll();
  render();
}

// ============================
// ゲーム完全削除 （タイトル横の × / Todoビュー）
// ============================
function removeGame(title) {
  if (!games[title]) return;
  if (!confirm(`${title} とそのタスクを完全に削除しますか？`)) return;

  delete games[title];
  const idx = gameOrder.indexOf(title);
  if (idx >= 0) gameOrder.splice(idx, 1);

  saveAll();
  render();
}

// ============================
// タイトルをドラッグ&ドロップで並べ替えたあと、配列を更新
// （drop イベント内から呼ぶ）
// ============================
function reorderGameOrder(fromIndex, toIndex) {
  // arr.splice(toIndex, 0, arr.splice(fromIndex, 1)[0])
  const movedTitle = gameOrder.splice(fromIndex, 1)[0];
  gameOrder.splice(toIndex, 0, movedTitle);
  saveGameOrder();  // 並び順のみ保存
  render();
}

// ============================
// Todo を追加
// ============================
function addTodo(title, todoText) {
  if (!games[title]) return;
  const text = todoText.trim();
  if (!text) return;
  games[title].todos.push(text);
  games[title].lastUpdated = Date.now();
  saveAll();
  render();
}

// ============================
// Todo だけをアーカイブに移動 （タスク横の ✓）
// ============================
function archiveTodo(title, index) {
  if (!games[title]) return;
  const removed = games[title].todos.splice(index, 1)[0];
  if (!removed) return;

  // archives[title] に追加
  if (!archives[title]) archives[title] = [];
  if (!archives[title].includes(removed)) {
    archives[title].push(removed);
  }

  games[title].lastUpdated = Date.now();
  saveAll();
  render();
}

// ============================
// Todo を誤って消したいだけ （タスク横の ×）
// ============================
function removeTodo(title, index) {
  if (!games[title]) return;
  games[title].todos.splice(index, 1);
  games[title].lastUpdated = Date.now();
  saveAll();
  render();
}

// ============================
// Todo の取り消し線 on/off（ここでは完成扱いにしないので 日付管理はなし）
// ============================
function toggleDone(title, index) {
  const liTasks = games[title].todos;
  if (!liTasks) return;

  // 今回は「見た目だけ取り消し線」で扱う場合は、doneフラグ + localStorage 保存しておけばOKです。
  // たとえば：games[title].done[index] = !games[title].done[index];
  if (!games[title].done) games[title].done = [];
  games[title].done[index] = !games[title].done[index];
  saveAll();
  render();
}

// ============================
// アーカイブ全体を TODO リストに戻す （Archiveビューの “↩ 戻す”）
// ============================
function restoreArchive(title) {
  if (!archives[title]) return;

  // すべてのアーカイブ済みタスクを games[title].todos に追加
  const taskList = archives[title];
  if (!games[title]) {
    games[title] = { status: "todo", lastUpdated: Date.now(), todos: [], done: [] };
    gameOrder.push(title);
  }
  taskList.forEach(text => {
    if (!games[title].todos.includes(text)) {
      games[title].todos.push(text);
    }
  });

  // archives から削除
  delete archives[title];

  saveAll();
  render();
}

// ============================
// アーカイブを完全に削除 （Archiveビューの “×”）
// ============================
function deleteArchive(title) {
  if (!archives[title]) return;
  if (!confirm(`${title} のアーカイブを完全に削除しますか？`)) return;

  delete archives[title];
  saveArchives();
  render();
}

// ============================
// localStorage へ 保存 (games + done 情報)
// ============================
function saveGames() {
  localStorage.setItem("gamesData", JSON.stringify(games));
}

// ============================
// localStorage へ 保存 (archives 情報)
// ============================
function saveArchives() {
  localStorage.setItem("archivesData", JSON.stringify(archives));
}

// ============================
// localStorage へ 保存 (gameOrder 情報)
// ============================
function saveGameOrder() {
  localStorage.setItem("gameOrder", JSON.stringify(gameOrder));
}

// ============================
// localStorage へまとめて保存
// ============================
function saveAll() {
  saveGames();
  saveArchives();
  saveGameOrder();
}

// ============================
// localStorage から 読み込み (games  + done フラグ)
// ============================
function loadGames() {
  const saved = localStorage.getItem("gamesData");
  if (saved) {
    try {
      games = JSON.parse(saved);
    } catch (e) {
      games = {};
    }
  } else {
    games = {};
  }

  // 後方互換措置：もし todos が文字列配列の場合はオブジェクトに変換
  Object.keys(games).forEach(title => {
    if (Array.isArray(games[title].todos)) {
      // すでに文字列配列のときはそのまま
    } else {
      games[title].todos = [];
    }
    if (!Array.isArray(games[title].done)) {
      games[title].done = [];
    }
  });
}

// ============================
// localStorage から 読み込み (archives)
// ============================
function loadArchives() {
  const saved = localStorage.getItem("archivesData");
  if (saved) {
    try {
      archives = JSON.parse(saved);
    } catch (e) {
      archives = {};
    }
  } else {
    archives = {};
  }
}

// ============================
// localStorage から 読み込み (gameOrder)
// ============================
function loadGameOrder() {
  const saved = localStorage.getItem("gameOrder");
  if (saved) {
    try {
      gameOrder = JSON.parse(saved);
    } catch (e) {
      gameOrder = [];
    }
  } else {
    // 初回起動時は gameOrder が空なので、まず games のキーすべてを順番に入れておく
    gameOrder = Object.keys(games);
  }

  // 「games にすでにないタイトル」は除外、かつ「games にあって gameOrder にないタイトル」を末尾に追加
  gameOrder = gameOrder.filter(title => games.hasOwnProperty(title));
  Object.keys(games).forEach(title => {
    if (!gameOrder.includes(title)) {
      gameOrder.push(title);
    }
  });
}

// ============================
// 最終的な描画処理
// ============================
function render() {
  const container = document.getElementById("content");
  container.innerHTML = "";

  // …（省略：gameOrder に沿った転送。既存のタブ処理）…

  if (currentTab === "todo") {
    // （省略：Todoビューの描画）
    gameOrder.forEach((title, idx) => {
      if (games[title] && games[title].status === "todo") {
        container.appendChild(createGameItem_Todo(title, games[title], idx));
      }
    });
  }
  else {
    // ===== アーカイブビュー =====

    // 変更点①：Object.keys(archives) をそのまま回す（配列長に関係なく表示）
    Object.keys(archives).forEach(title => {
      // もし archives[title] が存在する（たとえ空配列でも）なら描画対象にする
      if (archives.hasOwnProperty(title)) {
        container.appendChild(createGameItem_Archive(title, archives[title]));
      }
    });
  }
}

// ============================
// Todoビュー：ゲーム項目 (ドラッグ＆ドロップ機能付き)
// ============================
// 第３引数 idx は「gameOrder の何番目か」を示すインデックス
// ============================
function createGameItem_Todo(title, data, idx) {
  const wrapper = document.createElement("div");
  wrapper.className = "game-item";
  wrapper.setAttribute("draggable", "true");
  wrapper.dataset.index = idx; // 後で dragstart/drop で参照するため

  // ── dragstart イベント
  wrapper.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", idx); // 「何番目」を渡す
    e.dataTransfer.effectAllowed = "move";
    // 見た目を少し変えたければここで e.target.classList.add("dragging") など
  });

  // ── dragover / drop イベント
  wrapper.addEventListener("dragover", (e) => {
    e.preventDefault(); // drop を許可するために必要
    e.dataTransfer.dropEffect = "move";
    wrapper.classList.add("dragover"); // CSS で「ドロップ可能領域」のハイライトを出すときに使う
  });
  wrapper.addEventListener("dragleave", (e) => {
    wrapper.classList.remove("dragover");
  });
  wrapper.addEventListener("drop", (e) => {
    e.preventDefault();
    wrapper.classList.remove("dragover");
    const fromIndex = Number(e.dataTransfer.getData("text/plain"));
    const toIndex = Number(wrapper.dataset.index);

    if (!isNaN(fromIndex) && !isNaN(toIndex) && fromIndex !== toIndex) {
      reorderGameOrder(fromIndex, toIndex);
    }
  });

  // ── ゲームヘッダー (タイトル＋ボタン群)
  const header = document.createElement("div");
  header.className = "game-header";

  // タイトル表示
  const spanTitle = document.createElement("span");
  spanTitle.className = "title";
  spanTitle.textContent = title;
  header.appendChild(spanTitle);

  // 「✓ 完了」ボタン：ゲームごとアーカイブへ
  const btnArchiveGame = document.createElement("button");
  btnArchiveGame.className = "btn-status btn-ghost";
  btnArchiveGame.textContent = "✓ 完了";
  btnArchiveGame.addEventListener("click", (e) => {
    e.stopPropagation();
    if (confirm(`${title} のすべてのタスクをアーカイブに移しますか？`)) {
      archiveGame(title);
    }
  });

  // 「×」ボタン：ゲームごと完全削除
  const btnRemoveGame = document.createElement("button");
  btnRemoveGame.className = "btn-delete-game btn-ghost";
  btnRemoveGame.textContent = "×";
  btnRemoveGame.addEventListener("click", (e) => {
    e.stopPropagation();
    removeGame(title);
  });

  const btnGroup = document.createElement("div");
  btnGroup.className = "btn-group";
  btnGroup.appendChild(btnArchiveGame);
  btnGroup.appendChild(btnRemoveGame);
  header.appendChild(btnGroup);

  wrapper.appendChild(header);

  // ── Todo 本体
  const todoContainer = document.createElement("div");
  todoContainer.className = "todo-container";
  todoContainer.style.display = "block";

  const ul = document.createElement("ul");
  ul.className = "todo-list";

  (data.todos || []).forEach((text, tidx) => {
    const li = document.createElement("li");
    const spanText = document.createElement("span");
    spanText.className = "todo-text";
    spanText.textContent = text;
    if (data.done && data.done[tidx]) {
      spanText.classList.add("done");
    }
    li.appendChild(spanText);

    // 取り消し線用ボタン
    const btnToggleDone = document.createElement("button");
    btnToggleDone.textContent = "─"; 
    btnToggleDone.className = "btn-toggle-done btn-ghost";
    btnToggleDone.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDone(title, tidx);
    });
    li.appendChild(btnToggleDone);

    // タスク個別アーカイブボタン
    const btnArchiveTodo = document.createElement("button");
    btnArchiveTodo.className = "btn-archive btn-ghost";
    btnArchiveTodo.textContent = "✓";
    btnArchiveTodo.addEventListener("click", (e) => {
      e.stopPropagation();
      archiveTodo(title, tidx);
    });
    li.appendChild(btnArchiveTodo);

    // タスクだけ削除するボタン
    const btnRemoveTodo = document.createElement("button");
    btnRemoveTodo.className = "btn-remove-todo btn-ghost";
    btnRemoveTodo.textContent = "×";
    btnRemoveTodo.addEventListener("click", (e) => {
      e.stopPropagation();
      removeTodo(title, tidx);
    });
    li.appendChild(btnRemoveTodo);

    ul.appendChild(li);
  });

  todoContainer.appendChild(ul);

  // ── Todo 追加フォーム
  const addTodoDiv = document.createElement("div");
  addTodoDiv.className = "add-todo-container";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "新しいタスクを入力";

  const btnAdd = document.createElement("button");
  btnAdd.textContent = "追加";
  btnAdd.addEventListener("click", () => {
    addTodo(title, input.value);
    input.value = "";
  });

  addTodoDiv.appendChild(input);
  addTodoDiv.appendChild(btnAdd);
  todoContainer.appendChild(addTodoDiv);

  wrapper.appendChild(todoContainer);
  return wrapper;
}

// ============================
// アーカイブビュー：ゲーム項目＋一覧
// ============================
function createGameItem_Archive(title, archivedList) {
  const wrapper = document.createElement("div");
  wrapper.className = "game-item";

  // ── ヘッダー部分（タイトル＋「↩ 戻す」「×」ボタン）
  const header = document.createElement("div");
  header.className = "game-header";

  const spanTitle = document.createElement("span");
  spanTitle.className = "title";
  spanTitle.textContent = title;
  header.appendChild(spanTitle);

  // 「↩ 戻す」ボタン
  const btnRestore = document.createElement("button");
  btnRestore.className = "btn-restore btn-ghost";
  btnRestore.textContent = "↩ 戻す";
  btnRestore.addEventListener("click", (e) => {
    e.stopPropagation();
    restoreArchive(title);
  });
  header.appendChild(btnRestore);

  // 「×」ボタン（アーカイブ完全削除）
  const btnDelArch = document.createElement("button");
  btnDelArch.className = "btn-delete-archive btn-ghost";
  btnDelArch.textContent = "×";
  btnDelArch.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteArchive(title);
  });
  header.appendChild(btnDelArch);

  wrapper.appendChild(header);

  // ── タスク一覧部分（もし archivedList が空でも、タイトルだけは表示したい）
  const todoContainer = document.createElement("div");
  todoContainer.className = "todo-container";
  todoContainer.style.display = "block";

  const ul = document.createElement("ul");
  ul.className = "todo-list";

  // archivedList が空配列 [] の場合はループしないが、
  // <div class="todo-container"><ul class="todo-list"></ul></div> は生成されるので
  // 「タイトルだけ」が見える
  archivedList.forEach((text) => {
    const li = document.createElement("li");
    const spanText = document.createElement("span");
    spanText.className = "todo-text";
    spanText.textContent = text;
    li.appendChild(spanText);
    ul.appendChild(li);
  });

  todoContainer.appendChild(ul);
  wrapper.appendChild(todoContainer);

  return wrapper;
}
