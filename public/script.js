let commentDelete = document.querySelectorAll(".commentDelete");
for(let comment of commentDelete) {
  comment.addEventListener("click", (event) => {
    const mid = event.target.dataset.mid;
    const cid = event.target.dataset.cid;
    const csrf = event.target.dataset.csrf;
    fetch(`/message/${mid}/comment/${cid}/delete`, {
      method: "delete",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrf
      }
    }).then(response => response.json()).then(data => window.location.reload());
  });
}

let messageDelete = document.querySelectorAll(".messageDelete");
for(let message of messageDelete) {
  message.addEventListener("click", (event) => {
    const mid = event.target.dataset.mid;
    const csrf = event.target.dataset.csrf;
    fetch(`/message/${mid}/delete`, {
      method: "delete",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrf
      }
    }).then(response => response.json()).then(data => window.location.href="/home");
  });
}

let messageEdit = document.querySelectorAll(".messageEdit");
for(let message of messageEdit) {
  message.addEventListener("click", (event) => {
    const mid = event.target.dataset.mid;
    window.location.href = `/message/${mid}/edit`;
  });
}