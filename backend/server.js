const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const port = 5000;

// Налаштування CORS
const corsOptions = {
  origin: "http://localhost:3000",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],
};

app.use(cors(corsOptions));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(bodyParser.json());

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "quizles_db",
  password: "2146",
  port: 5432,
});

app.get("/", (req, res) => {
  res.send("Server is running!");
});

async function saveQuizToDatabase(quizData) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const quizResult = await client.query(
      "INSERT INTO quizzes (name, description) VALUES ($1, $2) RETURNING id",
      [quizData.name, quizData.description]
    );
    const quizId = quizResult.rows[0].id;
    for (const question of quizData.questions) {
      const questionResult = await client.query(
        "INSERT INTO questions (quiz_id, question_text, question_type) VALUES ($1, $2, $3) RETURNING id",
        [quizId, question.question, question.type]
      );
      const questionId = questionResult.rows[0].id;
      for (const answer of question.answers) {
        await client.query(
          "INSERT INTO answers (question_id, answer_text, is_correct, correct_text) VALUES ($1, $2, $3, $4)",
          [questionId, answer.text, answer.isCorrect, answer.correctText]
        );
      }
    }
    await client.query("COMMIT");
    return { message: "Quiz created successfully" };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

app.post("/create-quiz", async (req, res) => {
  console.log("Received quiz data:", req.body); // Перевірка отриманих даних
  try {
    const result = await saveQuizToDatabase(req.body);
    res.json(result);
  } catch (error) {
    console.error("Error saving quiz:", error);
    res
      .status(500)
      .json({ error: "Failed to create quiz", details: error.message });
  }
});

app.get("/quizzes", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = 6;
    const offset = (page - 1) * pageSize;

    const result = await pool.query(
      `
            SELECT q.id AS quiz_id, q.name AS quiz_name, q.description AS quiz_description,
                   qs.id AS question_id, qs.question_text, qs.question_type,
                   a.id AS answer_id, a.answer_text, a.is_correct, a.correct_text
            FROM quizzes q
            LEFT JOIN questions qs ON q.id = qs.quiz_id
            LEFT JOIN answers a ON qs.id = a.question_id
            ORDER BY q.id
            LIMIT $1 OFFSET $2;
            `,
      [pageSize, offset]
    );

    const quizzesMap = new Map();
    result.rows.forEach((row) => {
      if (!quizzesMap.has(row.quiz_id)) {
        quizzesMap.set(row.quiz_id, {
          id: row.quiz_id,
          name: row.quiz_name,
          description: row.quiz_description,
          questions: [],
          completions: [],
          averagePercentage: 0, // Додаємо поле для середнього відсотка
        });
      }
      const quiz = quizzesMap.get(row.quiz_id);
      if (
        row.question_id &&
        !quiz.questions.find((q) => q.id === row.question_id)
      ) {
        quiz.questions.push({
          id: row.question_id,
          question_text: row.question_text,
          question_type: row.question_type,
          answers: [],
        });
      }
      const question = quiz.questions.find((q) => q.id === row.question_id);
      if (
        row.answer_id &&
        question &&
        !question.answers.find((a) => a.id === row.answer_id)
      ) {
        question.answers.push({
          id: row.answer_id,
          answer_text: row.answer_text,
          is_correct: row.is_correct,
          correct_text: row.correct_text,
        });
      }
    });

    const quizzes = Array.from(quizzesMap.values());

    // Отримання результатів з quiz_completions та обчислення середнього відсотка
    for (const quiz of quizzes) {
      const completionsResult = await pool.query(
        "SELECT percentage FROM quiz_completions WHERE quiz_id = $1",
        [quiz.id]
      );
      quiz.completions = completionsResult.rows;

      if (completionsResult.rows.length > 0) {
        const totalPercentage = completionsResult.rows.reduce(
          (sum, row) => sum + parseFloat(row.percentage),
          0
        );
        quiz.averagePercentage =
          totalPercentage / completionsResult.rows.length;
      }
    }

    const totalResult = await pool.query("SELECT COUNT(*) FROM quizzes");
    const totalQuizzes = parseInt(totalResult.rows[0].count);
    const totalPages = Math.ceil(totalQuizzes / pageSize);

    res.json({ quizzes, totalPages, currentPage: page });
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    res.status(500).send("Server error");
  }
});
// Маршрут для видалення квіза за ID
app.delete("/quizzes/:id", async (req, res) => {
  const quizId = req.params.id;

  if (!quizId) {
    return res.status(400).json({ message: "Quiz ID is required" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Видаляємо всі відповіді користувачів, пов'язані з питаннями цього тесту
    await client.query(
      `DELETE FROM user_answers WHERE question_id IN (
        SELECT id FROM questions WHERE quiz_id = $1
      )`,
      [quizId]
    );

    // Видаляємо всі результати відповідей, пов'язані з питаннями цього тесту
    await client.query(
      `DELETE FROM answers_results WHERE question_id IN (
        SELECT id FROM questions WHERE quiz_id = $1
      )`,
      [quizId]
    );

    // Видаляємо всі відповіді, що належать питанням цього тесту
    await client.query(
      `DELETE FROM answers WHERE question_id IN (
        SELECT id FROM questions WHERE quiz_id = $1
      )`,
      [quizId]
    );

    // Видаляємо всі записи проходження тесту користувачами
    await client.query("DELETE FROM quiz_completions WHERE quiz_id = $1", [
      quizId,
    ]);

    // Видаляємо всі питання цього тесту
    await client.query("DELETE FROM questions WHERE quiz_id = $1", [quizId]);

    // Видаляємо сам тест
    await client.query("DELETE FROM quizzes WHERE id = $1", [quizId]);

    await client.query("COMMIT");

    res.json({ message: "Quiz deleted successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error deleting quiz:", error);
    res
      .status(500)
      .json({ message: "Error deleting quiz", details: error.message });
  } finally {
    client.release();
  }
});

app.get("/quizzes/:id", async (req, res) => {
  const quizId = req.params.id;

  // Перевірка на правильність отриманого ID
  if (!quizId) {
    return res.status(400).json({ message: "Quiz ID is required" });
  }

  try {
    const result = await pool.query(
      `
            SELECT q.id, q.name, q.description,
                   qs.id AS question_id, qs.question_text, qs.question_type,
                   a.id AS answer_id, a.answer_text, a.is_correct, a.correct_text
            FROM quizzes q
            LEFT JOIN questions qs ON q.id = qs.quiz_id
            LEFT JOIN answers a ON qs.id = a.question_id
            WHERE q.id = $1
            ORDER BY qs.id
            `,
      [quizId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const quiz = {
      id: result.rows[0].id,
      name: result.rows[0].name,
      description: result.rows[0].description,
      questions: [],
    };

    result.rows.forEach((row) => {
      let question = quiz.questions.find((q) => q.id === row.question_id);

      if (!question) {
        question = {
          id: row.question_id,
          question_text: row.question_text,
          question_type: row.question_type,
          answers: [],
        };
        quiz.questions.push(question);
      }

      if (row.answer_id) {
        question.answers.push({
          id: row.answer_id,
          answer_text: row.answer_text,
          is_correct: row.is_correct,
          correct_text: row.correct_text,
        });
      }
    });

    res.json(quiz);
  } catch (error) {
    console.error("Error fetching quiz:", error);
    res.status(500).json({ message: "Error fetching quiz data" });
  }
});

// ... ваш існуючий код ...

app.put("/quizzes/:id", async (req, res) => {
  const quizId = req.params.id;
  const quizData = req.body;

  console.log("Received quiz data for update:", quizData); // Додано логування

  if (!quizId) {
    return res.status(400).json({ message: "Quiz ID is required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log(
      "Updating quiz name and description:",
      quizData.name,
      quizData.description,
      quizId
    );
    await client.query(
      "UPDATE quizzes SET name = $1, description = $2 WHERE id = $3",
      [quizData.name, quizData.description, quizId]
    );

    console.log("Deleting existing answers for quiz ID:", quizId);
    await client.query(
      "DELETE FROM answers WHERE question_id IN (SELECT id FROM questions WHERE quiz_id = $1)",
      [quizId]
    );

    console.log("Deleting existing questions for quiz ID:", quizId);
    await client.query("DELETE FROM questions WHERE quiz_id = $1", [quizId]);

    for (const question of quizData.questions) {
      console.log(
        "Inserting new question:",
        question.question_text,
        question.question_type,
        quizId
      );
      const questionResult = await client.query(
        "INSERT INTO questions (quiz_id, question_text, question_type) VALUES ($1, $2, $3) RETURNING id",
        [quizId, question.question_text, question.question_type]
      );

      const questionId = questionResult.rows[0].id;

      for (const answer of question.answers) {
        console.log(
          "Inserting new answer:",
          answer.text,
          answer.isCorrect,
          answer.correctText,
          questionId
        );
        await client.query(
          "INSERT INTO answers (question_id, answer_text, is_correct, correct_text) VALUES ($1, $2, $3, $4)",
          [questionId, answer.text, answer.isCorrect, answer.correctText]
        );
      }
    }

    await client.query("COMMIT");

    res.json({ message: "Quiz updated successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating quiz:", error);
    console.error("Error stack:", error.stack);
    res
      .status(500)
      .json({ message: "Error updating quiz", details: error.message });
  } finally {
    client.release();
  }
});
app.post("/save-answer", async (req, res) => {
  try {
    // Отримуємо дані з тіла запиту (JSON)
    const { questionId, answerIndex, isCorrect } = req.body;

    // Перевірка на наявність необхідних даних
    if (!questionId || answerIndex === undefined || isCorrect === undefined) {
      return res.status(400).json({ error: "Invalid request data" });
    }

    // Додайте логіку для збереження відповіді в базу даних
    // Наприклад, використовуючи pool.query()
    await pool.query(
      "INSERT INTO answers_results (question_id, answer_index, is_correct) VALUES ($1, $2, $3)",
      [questionId, answerIndex, isCorrect]
    );

    // Відправляємо успішну відповідь клієнту
    res.json({ message: "Answer saved successfully" });
  } catch (error) {
    // Обробка помилок
    console.error("Error saving answer:", error);
    res
      .status(500)
      .json({ error: "Failed to save answer", details: error.message });
  }
});

app.post("/quiz-completions", async (req, res) => {
  const { quizId, correctAnswers, totalQuestions, percentage, timeTaken } =
    req.body;

  try {
    await pool.query(
      `
      INSERT INTO quiz_completions (quiz_id, correct_answers, total_questions, percentage, time_taken)
      VALUES ($1, $2, $3, $4, $5)
    `,
      [quizId, correctAnswers, totalQuestions, percentage, timeTaken]
    );

    res.status(200).json({ message: "Quiz completion saved successfully" });
  } catch (error) {
    console.error("Error saving quiz completion:", error);
    res.status(500).json({
      message: "Failed to save quiz completion",
      details: error.message,
    });
  }
});

app.get("/quiz-completions/:quizId", async (req, res) => {
  const quizId = req.params.quizId;

  try {
    const result = await pool.query(
      "SELECT COUNT(*) FROM quiz_completions WHERE quiz_id = $1",
      [quizId]
    );

    const count = parseInt(result.rows[0].count);
    res.status(200).json({ count: count });
  } catch (error) {
    console.error("Error counting quiz completions:", error);
    res.status(500).json({
      message: "Failed to count quiz completions",
      details: error.message,
    });
  }
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});
// ... ваш існуючий код ...
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
