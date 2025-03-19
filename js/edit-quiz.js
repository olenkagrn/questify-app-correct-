import {
  createNewQuestion,
  getFirstAnswerHTML,
  addAnswer,
  removeAnswer,
  removeQuestion,
  addAnswerToSection,
  addNewQuestion,
} from "./quiz-form-utils.js";

let questionCount = 1;

document.addEventListener("DOMContentLoaded", function () {
  const quizData = JSON.parse(localStorage.getItem("quizToEdit"));

  if (quizData) {
    fillEditForm(quizData);
  }
});

function fillEditForm(quizData) {
  document.getElementById("quizName").value = quizData.name;

  document.getElementById("quizDescription").value = quizData.description;
  const questionSection = document.querySelector(".question");

  while (
    questionSection.parentElement.children[1].classList.contains("question")
  ) {
    questionSection.parentElement.children[1].remove();
  }

  quizData.questions.forEach((question, index) => {
    if (index === 0) {
      fillFirstQuestion(question);
    } else {
      questionCount++;

      createNewQuestion(questionCount);

      fillQuestion(question, questionCount);
    }
  });
}

function fillFirstQuestion(question) {
  const firstQuestion = document.querySelector(".question");

  firstQuestion.querySelector(".question__input").value =
    question.question_text;

  firstQuestion.querySelector(".question__type").value = question.question_type;

  const answersSection = firstQuestion.querySelector(".answers");

  answersSection.innerHTML = "";

  question.answers.forEach((answer) => {
    addAnswerToSection(answersSection, question.question_type, answer);
  });
}

function fillQuestion(question, count) {
  const currentQuestion = document

    .querySelector(`#question-${count}`)

    .closest(".question");

  currentQuestion.querySelector(".question__input").value =
    question.question_text;

  currentQuestion.querySelector(".question__type").value =
    question.question_type;

  const answersSection = currentQuestion.querySelector(".answers");

  answersSection.innerHTML = "";

  question.answers.forEach((answer) => {
    addAnswerToSection(answersSection, question.question_type, answer);
  });
}

addNewQuestion.addEventListener("click", (event) => {
  if (event.target.classList.contains("create-quiz__add-question")) {
    questionCount++;

    createNewQuestion(questionCount);
  }
});

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

function clearForm() {
  document.getElementById("quizName").value = "";

  document.getElementById("quizDescription").value = "";

  const questionSections = document.querySelectorAll(".question");

  for (let i = questionSections.length - 1; i > 0; i--) {
    questionSections[i].remove();
  } // Очищення полів першого питання

  const firstQuestion = document.querySelector(".question");

  firstQuestion.querySelector(".question__input").value = "";

  firstQuestion.querySelector(".question__type").value = "text";

  const answersSection = firstQuestion.querySelector(".answers");

  answersSection.innerHTML = getFirstAnswerHTML(1);
}

document

  .getElementById("saveChangesButton")

  .addEventListener("click", updateQuiz);

async function updateQuiz(event) {
  event.preventDefault();

  const quizData = JSON.parse(localStorage.getItem("quizToEdit"));

  if (!quizData) {
    console.error("No quiz data found in localStorage");
    return;
  }

  const quizId = quizData.id;
  const quizName = document.getElementById("quizName").value;
  const quizDescription = document.getElementById("quizDescription").value;

  const questions = [];
  document.querySelectorAll(".question").forEach((questionElement) => {
    const questionText =
      questionElement.querySelector(".question__input").value;
    const questionType = questionElement.querySelector(".question__type").value;

    const answers = [];
    questionElement.querySelectorAll(".answer").forEach((answerElement) => {
      const answerText = answerElement.querySelector(".answer__input").value;
      const correctCheckbox = answerElement.querySelector(".answer__correct");
      const isCorrect = correctCheckbox ? correctCheckbox.checked : false;

      answers.push({
        text: answerText,
        isCorrect: isCorrect,
      });
    });

    questions.push({
      question_text: questionText,
      question_type: questionType,
      answers: answers,
    });
  });

  const updatedQuizData = {
    id: quizId,
    name: quizName,
    description: quizDescription,
    questions: questions,
  };

  console.log("Sending updated quiz data:", updatedQuizData); // Додано логування

  try {
    const response = await fetch(
      `https://questify-app-correct.onrender.com/quizzes/${quizId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedQuizData),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    alert("Quiz updated successfully!");
    window.location.href = "quiz-catalog.html";
  } catch (error) {
    console.error("Error updating quiz:", error);
    alert("Failed to update quiz: " + error.message);
  }
}
