// ============================
// データ構造＆順序配列
// ============================
let games = {};        // { "ゼルダの伝説": { status:"todo", lastUpdated:…, todos:[…], done:[…] }, … }
let archives = {};     // { "ゼルダの伝説": ["タスクA","タスクB"], … }
let gameOrder = [];    // タイトルの並び順を保持する配列。localStorage から復元する
let currentTab = "todo"; // "todo" または "storage"

// ============================
// 初回読み込み処理
// ============================
window.onload = () => {
  // 1) games と archives をロード
  loadGames();      // localStorage の "gamesData" を読み出して games にセット
  loadArchives();   // localStorage の "archivesData" を読み出して archives にセット

  // 2) gameOrder をロード（games の既存キーを順序通りに gameOrder へ）
  loadGameOrder();  // localStorage の "gameOrder" を読み込む or 初期化

  // 3) タブ切り替えボタンのイベント登録
  document.getElementById("tab-todo")
    .addEventListener("click", () => switchTab("todo"));
  document.getElementById("tab-storage")
    .addEventListener("click", () => switchTab("storage"));

  // 4) ゲーム追加ボタンのイベント登録
  document.getElementById("addGameBtn")
    .addEventListener("click", () => {
      const input = document.getElementById("gameInput");
      const title = input.value.trim();
      if (!title) return;
      addGame(title);
      input.value = "";
    });

  // 5) 全データをリセットするボタンのイベント登録
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

  // 6) 最終的なレンダリング
  render();
};

// ============================
// タブ切り替え処理
// ============================
function switchTab(tabName) {
  currentTab = tabName;
  document.getElementById("tab-todo").classList.toggle("active", tabName === "todo");
  document.getElementById("tab-storage").classList.toggle("active", tabName === "storage");
  document.getElementById("add-game-container").style.display = (tabName === "todo") ? "flex" : "none";
  render();
}

// ============================
// ゲームを追加
// ============================
function addGame(title) {
  if (!games[title]) {
    // 新規ゲームとして登録
    games[title] = { status: "todo", lastUpdated: Date.now(), todos: [], done: [] };
    // gameOrder に末尾追加
    gameOrder.push(title);
  } else {
    // 既存のタイトルがあった場合 → status を todo に戻す
    games[title].status = "todo";
    games[title].lastUpdated = Date.now();
    // gameOrder になければ末尾追加
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

  // 1) いま現存する todos 配列 (未完了タスク) を全部 archives[title] にコピーする
  const remainingTodos = games[title].todos || [];

  // archives[title] がなければ「空配列」で初期化
  if (!archives[title]) {
    archives[title] = [];
  }

  // もし残っているタスクがあれば、同じものを二重登録しないように追加
  remainingTodos.forEach(taskText => {
    if (!archives[title].includes(taskText)) {
      archives[title].push(taskText);
    }
  });

  // 2) games からタイトルそのものを削除し、gameOrder からも外す
  delete games[title];
  const idx = gameOrder.indexOf(title);
  if (idx >= 0) gameOrder.splice(idx, 1);

  saveAll();
  render();
}

// ============================
// ゲームを完全削除 (タイトル横の × / Todoビュー) 
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
// タイトルをドラッグして並べ替えたあとで gameOrder を更新
// drop イベントから呼び出す
// ============================
function reorderGameOrder(fromIndex, toIndex) {
  const movedTitle = gameOrder.splice(fromIndex, 1)[0];
  gameOrder.splice(toIndex, 0, movedTitle);
  saveGameOrder(); // 並び順だけを保存
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

  // archives[title] に存在しなければ初期化
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
// Todo の取り消し線 on/off（完了フラグのトグル）
// ============================
function toggleDone(title, index) {
  if (!games[title]) return;
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

  // 1) すべてのアーカイブ済みタスクを games[title].todos に追加
  if (!games[title]) {
    games[title] = { status: "todo", lastUpdated: Date.now(), todos: [], done: [] };
    gameOrder.push(title);
  }
  archives[title].forEach(text => {
    if (!games[title].todos.includes(text)) {
      games[title].todos.push(text);
    }
  });

  // 2) archives から完全削除
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
// localStorage から 読み込み (games + done フラグ)
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

  // 後方互換措置：もし todos が存在しない or 文字列配列なら初期化する
  Object.keys(games).forEach(title => {
    if (!Array.isArray(games[title].todos)) {
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
    // 初回起動時は、まず games の鍵すべてを gameOrder に流し込む
    gameOrder = Object.keys(games);
  }

  // もし gameOrder にあるけれど games に存在しないタイトルがあれば除去
  gameOrder = gameOrder.filter(title => games.hasOwnProperty(title));

  // もし games にあって gameOrder に含まれていないタイトルがあれば末尾に追加
  Object.keys(games).forEach(title => {
    if (!gameOrder.includes(title)) {
      gameOrder.push(title);
    }
  });
}

// ============================
// メイン描画関数
// ============================
function render() {
  const container = document.getElementById("content");
  container.innerHTML = "";

  // gameOrder が空（＝未ロード）の場合はロードする
  if (gameOrder.length === 0) {
    loadGameOrder();
  }

  if (currentTab === "todo") {
    // ===== Todo リストビュー =====
    gameOrder.forEach((title, idx) => {
      if (!games[title] || games[title].status !== "todo") return;
      container.appendChild(createGameItem_Todo(title, games[title], idx));
    });
  }
  else {
    // ===== アーカイブビュー =====
    // 空配列でもキーがあればタイトルだけ表示する
    Object.keys(archives).forEach(title => {
      if (!archives.hasOwnProperty(title)) return;
      container.appendChild(createGameItem_Archive(title, archives[title]));
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
  wrapper.dataset.index = idx; // ドラッグ操作時の「何番目か」を記録

  // ── dragstart イベント (ドラッグ開始時)
  wrapper.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", idx); 
    e.dataTransfer.effectAllowed = "move";
    // （必要なら CSS で .dragging クラスを付けるなど可能）
  });

  // ── dragover イベント (ドラッグした要素が上に来たとき)
  wrapper.addEventListener("dragover", (e) => {
    e.preventDefault(); // drop を許可
    wrapper.classList.add("dragover"); // CSS の強調用クラス
    e.dataTransfer.dropEffect = "move";
  });
  wrapper.addEventListener("dragleave", (e) => {
    wrapper.classList.remove("dragover");
  });

  // ── drop イベント (ドロップ時)
  wrapper.addEventListener("drop", (e) => {
    e.preventDefault();
    wrapper.classList.remove("dragover");
    const fromIndex = Number(e.dataTransfer.getData("text/plain"));
    const toIndex = Number(wrapper.dataset.index);
    if (!isNaN(fromIndex) && !isNaN(toIndex) && fromIndex !== toIndex) {
      reorderGameOrder(fromIndex, toIndex);
    }
  });

  // ── ゲームヘッダー (タイトル＋ボタン)
  const header = document.createElement("div");
  header.className = "game-header";

  // タイトルスパン
  const spanTitle = document.createElement("span");
  spanTitle.className = "title";
  spanTitle.textContent = title;
  header.appendChild(spanTitle);

  // 「✓ 完了」ボタン (ゲームごとアーカイブ移動)
  const btnArchiveGame = document.createElement("button");
  btnArchiveGame.className = "btn-status btn-ghost";
  btnArchiveGame.textContent = "✓";
  btnArchiveGame.addEventListener("click", (e) => {
    e.stopPropagation();
    if (confirm(`${title} のすべてのタスクをアーカイブに移しますか？`)) {
      archiveGame(title);
    }
  });

  // 「×」ボタン (ゲームごと完全削除)
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

  // ── Todo 本体部分
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

    // タスクの取り消し線＋完了フラグボタン
    const btnToggleDone = document.createElement("button");
    btnToggleDone.className = "btn-toggle-done btn-ghost";
    btnToggleDone.textContent = "─";
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

    // タスク誤字削除ボタン
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

  // ── アーカイブ済みタスク一覧
  const todoContainer = document.createElement("div");
  todoContainer.className = "todo-container";
  todoContainer.style.display = "block";

  const ul = document.createElement("ul");
  ul.className = "todo-list";

  // archivedList が空でも <ul> 要素だけは生成される → タイトルだけ表示される
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
