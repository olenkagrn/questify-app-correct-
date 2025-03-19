let currentPage = 1;
const quizzesPerPage = 6;

async function fetchQuizzes(page = 1) {
  try {
    const response = await fetch(
      `https://questify-app-correct.onrender.com/quizzes?page=${page}`
    );
    const data = await response.json();
    const quizzes = data.quizzes;
    const totalPages = data.totalPages;

    console.log("Quizzes response:", quizzes);

    const quizContainer = document.querySelector(".quiz-list");
    if (!quizContainer) {
      console.log("Container for quizzes not found!");
      return;
    }

    quizContainer.innerHTML = ""; // Reset quiz list before appending

    if (quizzes.length === 0) {
      const emptyMessage = document.createElement("h2");
      emptyMessage.innerHTML =
        "Your catalog is empty now,<br> please create quiz";
      quizContainer.appendChild(emptyMessage);
    } else {
      // Create a container to group the 6 quizzes
      const rowContainer = document.createElement("div");
      rowContainer.classList.add("quiz-row");

      quizzes.forEach((quiz, index) => {
        const { averagePercentage, name, description, questions, id } = quiz;
        const questionCount = questions ? questions.length : 0;

        const quizElement = document.createElement("article");
        quizElement.classList.add("quiz-card");
        quizElement.setAttribute("data-quiz-id", id);

        quizElement.innerHTML = `
          <div class="quiz-title__container">
            <h3 class="quiz-title">${name}</h3>
            <svg class="quiz-edit-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" onclick="openOptions(event)">
              <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M12 5.92A.96.96 0 1 0 12 4a.96.96 0 0 0 0 1.92m0 7.04a.96.96 0 1 0 0-1.92a.96.96 0 0 0 0 1.92M12 20a.96.96 0 1 0 0-1.92a.96.96 0 0 0 0 1.92" />
            </svg>
            <div class="quiz-options-container" style="display: none;">
              <button class="quiz-option-btn" onclick="editQuiz(event)">Edit</button>
              <button class="quiz-option-btn" onclick="runQuiz(event)">Run</button>
              <button class="quiz-option-btn" onclick="deleteQuiz(event)">Delete</button>
            </div>
          </div>
          <p class="quiz-description">${description}</p>
          <p class="quiz-questions">Questions: ${questionCount}</p>
          <p class="quiz-completions">Average percentage: ${
            averagePercentage !== null && averagePercentage !== undefined
              ? parseFloat(averagePercentage).toFixed(2) + "%"
              : "0.00%"
          }</p>
        `;

        rowContainer.appendChild(quizElement);

        // Every 6th quiz, append the row container and create a new one for the next 6 quizzes
        if (
          (index + 1) % quizzesPerPage === 0 ||
          index === quizzes.length - 1
        ) {
          quizContainer.appendChild(rowContainer);
          rowContainer.innerHTML = ""; // Reset the row for the next batch of quizzes
        }
      });
    }

    updatePagination(totalPages, page);
  } catch (error) {
    console.error("Error fetching quizzes:", error);
  }
}

async function deleteQuiz(event) {
  event.stopPropagation();
  const quizId = event.target
    .closest(".quiz-card")
    .getAttribute("data-quiz-id");

  try {
    const response = await fetch(
      `https://questify-app-correct.onrender.com/quizzes/${quizId}`,
      {
        method: "DELETE",
      }
    );

    if (response.ok) {
      const result = await response.json();
      console.log(result.message);

      const quizCard = event.target.closest(".quiz-card");
      if (quizCard) {
        quizCard.remove();
      }
    } else {
      const error = await response.json();
      console.error("Failed to delete quiz:", error.message);
    }
  } catch (error) {
    console.error("Error deleting quiz:", error);
  }
}

function updatePagination(totalPages, currentPage) {
  const paginationContainer = document.querySelector(".pagination");
  paginationContainer.innerHTML = "";

  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);

  if (startPage < 1) {
    startPage = 1;
    endPage = Math.min(5, totalPages);
  }

  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, totalPages - 4);
  }

  paginationContainer.innerHTML += `
    <a href="#" class="pagination-link ${
      currentPage === 1 ? "disabled" : ""
    }" onclick="changePage(${currentPage - 1})">
      <svg class="pagination-btn btn-left" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path fill="currentColor" d="M3.636 11.293a1 1 0 0 0 0 1.414l5.657 5.657a1 1 0 0 0 1.414-1.414L6.757 13H20a1 1 0 1 0 0-2H6.757l3.95-3.95a1 1 0 0 0-1.414-1.414z" />
      </svg>
    </a>
  `;

  for (let i = startPage; i <= endPage; i++) {
    paginationContainer.innerHTML += `
      <a href="#" class="pagination-link ${
        i === currentPage ? "active" : ""
      }" onclick="changePage(${i})">${i}</a>
    `;
  }

  paginationContainer.innerHTML += `
    <a href="#" class="pagination-link ${
      currentPage === totalPages ? "disabled" : ""
    }" onclick="changePage(${currentPage + 1})">
      <svg class="pagination-btn btn-right" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path fill="currentColor" d="M3.636 11.293a1 1 0 0 0 0 1.414l5.657 5.657a1 1 0 0 0 1.414-1.414L6.757 13H20a1 1 0 1 0 0-2H6.757l3.95-3.95a1 1 0 0 0-1.414-1.414z" />
      </svg>
    </a>
  `;
}

function changePage(page) {
  if (page < 1) return;
  currentPage = page;
  fetchQuizzes(currentPage);
}

fetchQuizzes(currentPage);
