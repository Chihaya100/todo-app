function addTask() {
  const input = document.getElementById("taskInput");
  const text = input.value.trim();
  if (text === "") return;

  const li = document.createElement("li");
  li.textContent = text;
  li.onclick = () => li.classList.toggle("done");

  const del = document.createElement("button");
  del.textContent = "削除";
  del.onclick = () => li.remove();

  li.appendChild(del);
  document.getElementById("taskList").appendChild(li);
  input.value = "";
}
