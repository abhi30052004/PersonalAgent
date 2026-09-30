# Pre-Sales AI Agent Version 2

## Overview
Pre-Sales AI Agent Version 2 is an AI-powered system for understanding job/project requirements, asking focused clarification questions, matching requirements with available resources, and generating demo-related outputs.

## Core Workflow
1. Extract requirements from a job description or project request.
2. Ask up to three clarifying questions when required.
3. Match requirements against available employee/resource information.
4. Generate structured matching results.
5. Generate demo-related output based on the collected requirements.

## Business Logic
- Development cost is calculated using rate × 8 × number of working days.
- Ten weeks is treated as 50 working days.
- Budget information is not invented when it is not provided.
- The matching flow is designed around a maximum of one developer where that constraint applies.

## Technology
- Python
- FastAPI
- OpenAI
- Conversational state-machine workflow
- AI / LLM tool-calling patterns

## API
Production API: https://presalesapi.vestaging.in

## Development
The Version 2 implementation focuses on a conversational state-machine approach rather than relying on the earlier LangGraph-based workflow.
