export const questionSection = document.querySelector(".question");

export const addNewQuestion = document.querySelector(
  ".create-quiz__add-question"
);
console.log(addNewQuestion);
let questionCount = 1;

// Функція для створення нового питання
export function createNewQuestion(count) {
  const newQuestion = document.createElement("section");
  newQuestion.classList.add("question");
  newQuestion.innerHTML = `
            <h2 class="question__title">Question</h2>
            <div class="question__item">
                <label for="question-${count}" class="question__label">${count}</label>
                <input type="text" id="question-${count}" class="quiz-input question__input" placeholder="Question text" />
                <select class="question__type">
                    <option value="text">Text</option>
                    <option value="single">Single Choice</option>
                    <option value="multiple">Multiple Choice</option>
                </select>
                <button type="button" class="question__remove">
                    <svg class="question__remove" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 15 15">
                        <path fill="currentColor" fill-rule="evenodd" d="M11.782 4.032a.575.575 0 1 0-.813-.814L7.5 6.687L4.032 3.218a.575.575 0 0 0-.814.814L6.687 7.5l-3.469 3.468a.575.575 0 0 0 .814.814L7.5 8.313l3.469 3.469a.575.575 0 0 0 .813-.814L8.313 7.5z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
            <section class="answers">
                ${getFirstAnswerHTML(count)}
            </section>
            <button type="button" class="question__add-answer">Add Answer</button>
        `;
  questionSection.parentElement.insertBefore(newQuestion, addNewQuestion);

  const questionTypeSelect = newQuestion.querySelector(".question__type");
  questionTypeSelect.addEventListener("change", (event) => {
    const answersSection = newQuestion.querySelector(".answers");
    answersSection.innerHTML = getFirstAnswerHTML(count, event.target.value);
  });
}

// Функція для генерації HTML першої відповіді
export function getFirstAnswerHTML(count, type = "text") {
  if (type === "text") {
    return `
                <h2 class="answers__title">Answer</h2>
                <div class="answer">
                    <label for="text-answer-${count}" class="answer__label">Answer</label>
                    <input type="text" id="text-answer-${count}" class="quiz-input answer__input" placeholder="Correct answer text">
                    <button type="button" class="answer__remove">Remove</button>
                </div>
            `;
  } else if (type === "multiple") {
    return `
                <h2 class="answers__title">Answers</h2>
                <div class="answer">
                    <h3 class="answer__title">Choice</h3>
                    <label for="answer-1" class="answer__label">1</label>
                    <input type="text" id="answer-1" class="quiz-input answer__input" placeholder="Answer text">
                    <input type="checkbox" class="answer__correct" data-correct="false">
                    <button type="button" class="answer__remove">Remove</button>
                </div>
            `;
  } else {
    return `
                <h2 class="answers__title">Answers</h2>
                <div class="answer">
                    <h3 class="answer__title">Choice</h3>
                    <label for="answer-1" class="answer__label">1</label>
                    <input type="text" id="answer-1" class="quiz-input answer__input" placeholder="Answer text">
                    <input type="radio" name="correct-answer-${count}" class="answer__correct" data-correct="false">
                    <button type="button" class="answer__remove">Remove</button>
                </div>
            `;
  }
}

// Функція для додавання відповіді
export function addAnswer(event) {
  const questionSection = event.target.closest(".question");
  const questionTypeSelect = questionSection.querySelector(".question__type");
  const questionType = questionTypeSelect.value;
  const currentQuestionCount =
    questionSection.querySelector(".question__label").textContent;
  const answersSection = event.target.previousElementSibling;
  const answerCount = answersSection.querySelectorAll(".answer").length + 1;

  let newAnswerHTML = "";
  if (questionType === "single") {
    newAnswerHTML = `
                <h3 class="answer__title">Choice</h3>
                <label for="answer-${answerCount}" class="answer__label">${answerCount}</label>
                <input type="text" id="answer-${answerCount}" class="quiz-input answer__input" placeholder="Answer text">
                <input type="radio" name="correct-answer-${currentQuestionCount}" class="answer__correct" data-correct="false">
                <button type="button" class="answer__remove">Remove</button>
            `;
  } else if (questionType === "text") {
    answersSection.innerHTML = `
                <h2 class="answers__title">Answer</h2>
                <div class="answer">
                    <label for="text-answer-${currentQuestionCount}" class="answer__label">Answer</label>
                    <input type="text" id="text-answer-${currentQuestionCount}" class="quiz-input answer__input" placeholder="Correct answer text">
                    <button type="button" class="answer__remove">Remove</button>
                </div>
            `;
    return;
  } else if (questionType === "multiple") {
    newAnswerHTML = `
                <h3 class="answer__title">Choice</h3>
                <label for="answer-${answerCount}" class="answer__label">${answerCount}</label>
                <input type="text" id="answer-${answerCount}" class="quiz-input answer__input" placeholder="Answer text">
                <input type="checkbox" class="answer__correct" data-correct="false">
                <button type="button" class="answer__remove">Remove</button>
            `;
  } else {
    console.log("Cannot add answer for this question type.");
    return;
  }
  const newAnswer = document.createElement("div");
  newAnswer.classList.add("answer");
  newAnswer.innerHTML = newAnswerHTML;
  answersSection.appendChild(newAnswer);
}

// Функція для видалення елемента (відповіді)
export function removeAnswer(event) {
  if (event.target.classList.contains("answer__remove")) {
    const answerElement = event.target.parentElement;
    const answersSection = answerElement.closest(".answers");

    answerElement.remove();

    // Оновлення порядкових номерів для залишкових відповідей
    const answerLabels = answersSection.querySelectorAll(".answer__label");
    answerLabels.forEach((label, index) => {
      label.textContent = index + 1; // Оновлюємо текст мітки
    });
  }
}

export function removeQuestion(event) {
  if (event.target.classList.contains("question__remove")) {
    const questionSection = event.target.closest(".question");
    if (questionSection) {
      const questionLabel = questionSection.querySelector(".question__label");
      const removedQuestionNumber = parseInt(questionLabel.textContent);
      questionSection.remove();

      // Оновлення лічильників питань
      const allQuestions = document.querySelectorAll(".question");
      allQuestions.forEach((question, index) => {
        const currentQuestionLabel = question.querySelector(".question__label");
        const currentQuestionNumber = parseInt(
          currentQuestionLabel.textContent
        );
        if (currentQuestionNumber > removedQuestionNumber) {
          currentQuestionLabel.textContent = currentQuestionNumber - 1;
        }
      });

      questionCount--;
    }
  }
}
export function addAnswerToSection(answersSection, type, answer) {
  let newAnswer = document.createElement("div");
  newAnswer.classList.add("answer");
  if (type === "text") {
    newAnswer.innerHTML = `<label class="answer__label">Answer</label><input type="text" class="quiz-input answer__input" value="${answer.answer_text}"/><button type="button" class="answer__remove">Remove</button>`;
  } else if (type === "single" || type === "multiple") {
    newAnswer.innerHTML = `<h3 class="answer__title">Choice</h3><label class="answer__label">${
      answersSection.children.length + 1
    }</label><input type="text" class="quiz-input answer__input" value="${
      answer.answer_text
    }"/><input type="${
      type === "single" ? "radio" : "checkbox"
    }" class="answer__correct" ${
      answer.is_correct ? "checked" : ""
    }/><button type="button" class="answer__remove">Remove</button>`;
  }
  answersSection.appendChild(newAnswer);
}
