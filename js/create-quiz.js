import {
  createNewQuestion,
  getFirstAnswerHTML,
  addAnswer,
  removeAnswer,
  removeQuestion,
  addAnswerToSection,
  addNewQuestion,
  questionSection,
} from "./quiz-form-utils.js";

let questionCount = 1;

function sendDataToBackend(data) {
  fetch("http://localhost:5000/create-quiz", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((result) => {
      console.log("Success:", result);
      alert("Quiz created successfully!");
      clearForm(); // Очищаємо форму після успішного створення
      window.location.href = "quiz-catalog.html";
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Failed to create quiz: " + error.message);
    });
}

function collectData(event) {
  event.preventDefault();
  const quizName = document.getElementById("quizName").value; // Отримання назви вікторини
  const quizDescription = document.getElementById("quizDescription").value; // Отримання опису вікторини
  const questions = [];

  // Перебір усіх запитань
  document.querySelectorAll(".question").forEach((question, index) => {
    const questionText = question.querySelector(".question__input").value;
    const questionType = question.querySelector(".question__type").value;
    const answers = [];

    // Перебір всіх відповідей для запитання
    question.querySelectorAll(".answer").forEach((answerElement) => {
      const answerText = answerElement.querySelector(".answer__input").value;
      let isCorrect = false;
      let correctText = null;

      if (questionType === "single" || questionType === "multiple") {
        isCorrect = answerElement.querySelector(".answer__correct").checked;
      } else if (questionType === "text") {
        isCorrect = true;
        correctText = answerText; // У випадку текстової відповіді
      }

      answers.push({
        text: answerText,
        isCorrect: isCorrect,
        correctText: correctText,
      });
    });

    questions.push({
      question: questionText,
      type: questionType,
      answers: answers,
    });
  });

  const quizData = {
    name: quizName,
    description: quizDescription,
    questions: questions,
  };

  console.log(quizData);
  sendDataToBackend(quizData); // Відправка даних на сервер
}

// Обробники подій
addNewQuestion.addEventListener("click", (event) => {
  if (event.target.classList.contains("create-quiz__add-question")) {
    questionCount++;
    createNewQuestion(questionCount);
  }
});

// Делегування подій для видалення питань
document.addEventListener("click", (event) => {
  if (event.target.classList.contains("question__remove")) {
    removeQuestion(event);
  }
});

document.addEventListener("click", (event) => {
  if (event.target.classList.contains("question__add-answer")) {
    addAnswer(event);
  } else {
    removeAnswer(event);
  }
});

document
  .getElementById("create-quiz__submit")
  .addEventListener("click", collectData);

function clearForm() {
  document.getElementById("quizName").value = "";
  document.getElementById("quizDescription").value = "";

  // Видалення всіх питань, крім першого
  const questionSections = document.querySelectorAll(".question");
  for (let i = questionSections.length - 1; i > 0; i--) {
    questionSections[i].remove();
  }

  // Очищення полів першого питання
  const firstQuestion = document.querySelector(".question");
  firstQuestion.querySelector(".question__input").value = "";
  firstQuestion.querySelector(".question__type").value = "text"; // Скидання типу питання до значення за замовчуванням

  // Очищення відповідей першого питання
  const answersSection = firstQuestion.querySelector(".answers");
  answersSection.innerHTML = getFirstAnswerHTML(1); // Очищення відповідей
}
