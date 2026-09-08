export const submissionController = {
	async createSubmission(req, res) {
		return res.status(501).send({
			error: 'Public submissions are not implemented yet',
		});
	},
};
