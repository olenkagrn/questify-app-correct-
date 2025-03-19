let questions = [];
let startTime;
let endTime;

document.addEventListener("DOMContentLoaded", () => {
  const quizData = JSON.parse(localStorage.getItem("quizToRun"));

  if (!quizData) {
    console.error("Quiz data not found in localStorage");
    return;
  }

  // Виведення даних вікторини
  document.getElementById("quiz-title").innerText = quizData.name;
  document.getElementById("quiz-description").innerText = quizData.description;
  document.getElementById(
    "question-count"
  ).innerText = `Questions: ${quizData.questions.length}`;

  questions = quizData.questions;

  // Додавання обробника для кнопки "Start Quiz"
  document.getElementById("start-quiz-btn").addEventListener("click", () => {
    startQuiz(quizData.questions);
  });
});

async function fetchQuizData(quizId) {
  try {
    const response = await fetch(
      `https://questify-app-correct.onrender.com/quizzes/${quizId}`
    );
    const data = await response.json();
    console.log("Quiz data:", data); // Додайте цей рядок
    if (!data || !data.name || !data.description || !data.questions) {
      console.error("Invalid quiz data");
      return;
    }

    // Виведення даних квізу
    document.getElementById("quiz-title").innerText = data.name;
    document.getElementById("quiz-description").innerText = data.description;
    document.getElementById(
      "question-count"
    ).innerText = `Questions: ${data.questions.length}`;

    questions = data.questions;

    // Додаємо обробник для кнопки "Start Quiz"
    document.getElementById("start-quiz-btn").addEventListener("click", () => {
      startQuiz(data.questions);
    });
  } catch (error) {
    console.error("Error fetching quiz data:", error);
  }
}

function startQuiz(questions) {
  const quizQuestionsContainer = document.getElementById("quiz-questions");

  quizQuestionsContainer.innerHTML = "";
  document.getElementById("start-quiz-btn").style.display = "none";

  questions.forEach((question, index) => {
    const questionElement = document.createElement("div");
    questionElement.classList.add("question");
    let answersHtml = "";

    switch (question.question_type) {
      case "single":
        answersHtml = question.answers
          .map(
            (answer, i) => `
                            <div class="answer" data-question-index="${index}" data-answer-index="${i}">
                                <input type="radio" name="question-${index}" value="${i}">
                                ${answer.answer_text}
                            </div>
                        `
          )
          .join("");
        break;
      case "multiple":
        answersHtml = question.answers
          .map(
            (answer, i) => `
                            <div class="answer" data-question-index="${index}" data-answer-index="${i}">
                                <input type="checkbox" name="question-${index}" value="${i}">
                                ${answer.answer_text}
                            </div>
                        `
          )
          .join("");
        break;
      case "text":
        answersHtml = `<input type="text" class="text-answer" data-question-index="${index}">`;
        break;
      default:
        answersHtml = "Unsupported question type";
    }

    questionElement.innerHTML = `
            <h3>${question.question_text}</h3>
            ${answersHtml}
        `;

    quizQuestionsContainer.appendChild(questionElement);
  });

  // Додаємо обробники подій
  document
    .querySelectorAll(
      ".answer input[type='radio'], .answer input[type='checkbox']"
    )
    .forEach((input) => {
      input.addEventListener("change", handleAnswerSelection);
    });

  document.querySelectorAll(".text-answer").forEach((input) => {
    input.addEventListener("blur", handleTextAnswer);
  });

  const submitButton = document.createElement("button");
  submitButton.innerText = "Submit Quiz";
  submitButton.id = "submit-quiz-btn";
  quizQuestionsContainer.appendChild(submitButton);

  submitButton.addEventListener("click", submitQuiz);

  startTime = new Date();
}

async function submitQuiz() {
  endTime = new Date();
  const correctAnswersCount = calculateCorrectAnswers();
  const totalQuestions = questions.length;
  let percentage = (correctAnswersCount / totalQuestions) * 100;
  percentage = parseFloat(percentage.toFixed(2));
  const timeTaken = formatTime(endTime - startTime);

  displayResults(correctAnswersCount, percentage, timeTaken);
  document.getElementById("catalog-link").style.display = "block";

  document.getElementById("submit-quiz-btn").style.display = "none";

  // Отримання quizId з localStorage
  const quizData = JSON.parse(localStorage.getItem("quizToRun"));
  const quizId = quizData.id;

  try {
    const response = await fetch(
      "https://questify-app-correct.onrender.com/quiz-completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quizId: quizId,
          correctAnswers: correctAnswersCount,
          totalQuestions: totalQuestions,
          percentage: percentage,
          timeTaken: timeTaken,
        }),
      }
    );

    if (response.ok) {
      console.log("Quiz results saved successfully");
    } else {
      console.error("Failed to save quiz results");
    }
  } catch (error) {
    console.error("Error saving quiz results:", error);
  }
}

function calculateCorrectAnswers() {
  let correctAnswersCount = 0;
  document.querySelectorAll(".question").forEach((questionElement, index) => {
    const question = questions[index];
    if (question.question_type === "single") {
      // Логіка для single choice
      const correctAnswerIndex = question.answers.findIndex(
        (answer) => answer.is_correct
      );
      const selectedAnswerIndex = questionElement.querySelector(
        "input[type='radio']:checked"
      )?.value;
      if (parseInt(selectedAnswerIndex) === correctAnswerIndex) {
        correctAnswersCount++;
      }
    } else if (question.question_type === "multiple") {
      const selectedAnswers = questionElement.querySelectorAll(
        "input[type='checkbox']:checked"
      );
      let correctSelections = 0;
      let totalCorrectAnswers = 0;

      question.answers.forEach((answer, answerIndex) => {
        if (answer.is_correct) {
          totalCorrectAnswers++;
          selectedAnswers.forEach((selectedAnswer) => {
            if (parseInt(selectedAnswer.value) === answerIndex) {
              correctSelections++;
            }
          });
        }
      });

      if (totalCorrectAnswers > 0) {
        correctAnswersCount += correctSelections / totalCorrectAnswers;
      }
    } else if (question.question_type === "text") {
      const answerInput = questionElement.querySelector(".text-answer");
      const correctAnswer = question.answers.find(
        (answer) => answer.is_correct
      );

      if (correctAnswer) {
        if (
          answerInput.value.toLowerCase() ===
          correctAnswer.answer_text.toLowerCase()
        ) {
          correctAnswersCount++;
        }
      } else {
        console.error("Correct answer not found for question:", question.id);
      }
    }
  });
  return correctAnswersCount;
}

function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function displayResults(correctAnswersCount, percentage, timeTaken) {
  const resultsContainer = document.createElement("div");
  resultsContainer.id = "quiz-results";
  resultsContainer.innerHTML = `
        <h2>Quiz Results</h2>
        <p>Correct Answers: ${correctAnswersCount}/${
    questions.length
  } (${percentage.toFixed(2)}%)</p>
        <p>Time Taken: ${timeTaken}</p>
    `;
  document.getElementById("quiz-questions").appendChild(resultsContainer);
}

function handleAnswerSelection(event) {
  const questionIndex = event.target
    .closest(".answer")
    .getAttribute("data-question-index");
  const answerIndex = event.target.value;
  const isCorrect = event.target.checked; // Для checkbox

  // Логіка для збереження відповіді (залежно від типу питання)
  const question = questions[questionIndex];
  if (question.question_type === "single") {
    // Для single choice
    const correctAnswerIndex = question.answers.findIndex(
      (answer) => answer.is_correct
    );
    if (parseInt(answerIndex) === correctAnswerIndex) {
      event.target.closest(".answer").classList.add("correct");
      saveAnswer(question.id, answerIndex, true);
    } else {
      event.target.closest(".answer").classList.add("incorrect");
      saveAnswer(question.id, answerIndex, false);
    }
  } else if (question.question_type === "multiple") {
    // Логіка для multiple choice
    const isAnswerCorrect = question.answers[answerIndex].is_correct;
    if (isAnswerCorrect) {
      event.target.closest(".answer").classList.add("correct");
      saveAnswer(question.id, answerIndex, true);
    } else {
      event.target.closest(".answer").classList.add("incorrect");
      saveAnswer(question.id, answerIndex, false);
    }
  }
}

function handleTextAnswer(event) {
  const questionIndex = event.target.getAttribute("data-question-index");
  const answerText = event.target.value;

  const question = questions[questionIndex];
  const correctAnswer = question.answers.find(
    (answer) => answer.is_correct
  )?.answer_text;

  if (
    correctAnswer &&
    answerText.toLowerCase() === correctAnswer.toLowerCase()
  ) {
    event.target.classList.add("correct");
    saveAnswer(question.id, answerText, true);
  } else {
    event.target.classList.add("incorrect");
    saveAnswer(question.id, answerText, false);
  }
}

// Функція для збереження результату в БД
async function saveAnswer(questionId, answerIndex, isCorrect) {
  try {
    const response = await fetch("http://localhost:5000/save-answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        questionId,
        answerIndex,
        isCorrect,
      }),
    });

    if (response.ok) {
      console.log("Answer saved successfully");
    } else {
      console.error("Failed to save answer");
    }
  } catch (error) {
    console.error("Error saving answer:", error);
  }
}
