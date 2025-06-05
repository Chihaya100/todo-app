let games = {};
let currentTab = "todo";
let sortedEntries = null;

window.onload = () => {
  loadGames();
  document.getElementById("tab-todo").addEventListener("click", () => switchTab("todo"));
  document.getElementById("tab-storage").addEventListener("click", () => switchTab("storage"));
  document.getElementById("addGameBtn").addEventListener("click", () => {
    const input = document.getElementById("gameInput");
    const title = input.value.trim();
    if (title === "") return;
    addGame(title);
    input.value = "";
  });
  document.getElementById("resetAllBtn").addEventListener("click", () => {
    if (confirm("すべてのデータを削除しますか？")) {
      localStorage.clear();
      games = {};
      sortedEntries = null;
      render();
    }
  });
  render();
};

function switchTab(tabName) {
  currentTab = tabName;
  document.getElementById("tab-todo").classList.toggle("active", tabName === "todo");
  document.getElementById("tab-storage").classList.toggle("active", tabName === "storage");
  document.getElementById("add-game-container").style.display = tabName === "todo" ? "flex" : "none";
  render();
}

function addGame(title) {
  if (!games[title]) {
    games[title] = { status: "todo", lastUpdated: Date.now(), todos: [] };
  } else {
    games[title].status = "todo";
    games[title].lastUpdated = Date.now();
  }
  saveGames();
  render();
}

function deleteGame(title) {
  if (!games[title]) return;
  const game = games[title];
  const todos = game.todos || [];

  games[title] = {
    status: "storage",
    lastUpdated: Date.now(),
    todos: todos.map(t => ({ text: t.text, done: false }))
  };

  saveGames();
  render();
}

function toggleGameStatus(title) {
  if (!games[title]) return;
  games[title].status = games[title].status === "todo" ? "storage" : "todo";
  games[title].lastUpdated = Date.now();
  saveGames();
  render();
}

function addTodo(title, todoText) {
  if (!games[title]) return;
  const text = todoText.trim();
  if (text === "") return;
  games[title].todos.push({ text, done: false });
  games[title].lastUpdated = Date.now();
  saveGames();
  render();
}

function deleteTodo(title, index) {
  if (!games[title]) return;
  const removed = games[title].todos.splice(index, 1)[0];
  if (!removed) return;

  // アーカイブへ保存（タイトルが存在しなければ作成）
  if (!games[title] || games[title].status !== "storage") {
    if (!games[title + "_archive"]) {
      games[title + "_archive"] = {
        status: "storage",
        lastUpdated: Date.now(),
        todos: []
      };
    }
    games[title + "_archive"].todos.push({ text: removed.text, done: false });
    games[title + "_archive"].lastUpdated = Date.now();
  }

  games[title].lastUpdated = Date.now();
  saveGames();
  render();
}

function toggleDone(title, index) {
  const task = games[title]?.todos?.[index];
  if (!task) return;
  task.done = !task.done;
  saveGames();
  render();
}

function saveGames() {
  localStorage.setItem("gamesData", JSON.stringify(games));
  sortedEntries = null;
}

function loadGames() {
  const saved = localStorage.getItem("gamesData");
  if (saved) {
    try {
      games = JSON.parse(saved);
    } catch (e) {
      games = {};
    }
  }
}

function render() {
  const container = document.getElementById("content");
  container.innerHTML = "";

  if (!sortedEntries) {
    sortedEntries = Object.entries(games).sort((a, b) => b[1].lastUpdated - a[1].lastUpdated);
  }

  sortedEntries.forEach(([title, data]) => {
    if (data.status !== currentTab) return;
    container.appendChild(createGameItem(title, data, currentTab === "storage"));
  });
}

function createGameItem(title, data, isArchive = false) {
  const wrapper = document.createElement("div");
  wrapper.className = "game-item";

  const header = document.createElement("div");
  header.className = "game-header";

  const spanTitle = document.createElement("span");
  spanTitle.className = "title";
  spanTitle.textContent = title.replace(/_archive$/, "");

  header.addEventListener("click", () => {
    const todoContainer = wrapper.querySelector(".todo-container");
    todoContainer.style.display = todoContainer.style.display === "none" ? "block" : "none";
  });

  header.appendChild(spanTitle);

  if (!isArchive) {
    const btnStatus = document.createElement("button");
    btnStatus.className = "btn-status btn-ghost";
    btnStatus.textContent = data.status === "todo" ? "✓ " : "↩ 戻す";
    btnStatus.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleGameStatus(title);
    });

    const btnDeleteGame = document.createElement("button");
    btnDeleteGame.className = "btn-delete-game btn-ghost";
    btnDeleteGame.textContent = "×";
    btnDeleteGame.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteGame(title);
    });

    const btnGroup = document.createElement("div");
    btnGroup.className = "btn-group";
    btnGroup.appendChild(btnStatus);
    btnGroup.appendChild(btnDeleteGame);
    header.appendChild(btnGroup);
  }

  wrapper.appendChild(header);

  const todoContainer = document.createElement("div");
  todoContainer.className = "todo-container";
  todoContainer.style.display = "block";

  const ul = document.createElement("ul");
  ul.className = "todo-list";

  data.todos.forEach((task, idx) => {
    const li = document.createElement("li");
    const spanText = document.createElement("span");
    spanText.className = "todo-text";
    spanText.textContent = task.text;
    if (task.done) spanText.classList.add("done");

    li.appendChild(spanText);

    if (!isArchive) {
      const btnToggleDone = document.createElement("button");
      btnToggleDone.textContent = "─";
      btnToggleDone.className = "btn-toggle-done btn-ghost";
      btnToggleDone.addEventListener("click", () => toggleDone(title, idx));

      const btnDel = document.createElement("button");
      btnDel.className = "btn-delete-todo btn-ghost";
      btnDel.textContent = "×";
      btnDel.addEventListener("click", () => deleteTodo(title, idx));

      li.appendChild(btnToggleDone);
      li.appendChild(btnDel);
    }

    ul.appendChild(li);
  });

  todoContainer.appendChild(ul);

  if (!isArchive) {
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
  }

  wrapper.appendChild(todoContainer);
  return wrapper;
}
