
from groq import Groq

client = Groq()

response = client.chat.completions.create(
    model="openai/gpt-oss-120b",
    messages=[
        {
            "role": "user",
            "content": "Reply with exactly: Groq AI connected successfully!"
        }
    ],
    max_completion_tokens=100
)

print(response.choices[0].message.content)
