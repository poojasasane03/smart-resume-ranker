const express = require("express");
const {
  getJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob,
} = require("../controllers/jobController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect); // every job route below needs a logged-in user

router.route("/").get(getJobs).post(createJob);
router.route("/:id").get(getJob).put(updateJob).delete(deleteJob);

module.exports = router;
