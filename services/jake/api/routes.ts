// Jake API Routes

  /**
   * POST /api/v1/jake/research-choreography
   * Get 3-stage research animation choreography
   */
  fastify.post('/api/v1/jake/research-choreography', async (request, reply) => {
    const offerData = request.body as OfferData;

    try {
      const choreography = await jakeService.getResearchChoreography(offerData);
      return { stages: choreography };
    } catch (error) {
      reply.status(500).send({
        error: 'Failed to generate research choreography',
        message: (error as Error).message,
      });
    }
  });
}
