import {createSwaggerSpec} from 'next-swagger-doc'

export const getApiDocs = async () => {
    return createSwaggerSpec({
        apiFolder: 'app/api',
        definition: {
            openapi: '3.0.0',
            info: {
                title: 'My API Documentation',
                version: '1.0.0',
                description: 'API documentation for my Next.js app',
            },
            servers: [
                {
                    url: 'http://localhost:3000',
                    description: 'Development server',
                },
                {
                    url: 'https://story-teller-batrinutsilvius-projects.vercel.app',
                    description: 'Production server',
                },
            ],
        },
    })
}
