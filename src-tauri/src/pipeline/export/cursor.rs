use crate::pipeline::traits::CompressedContext;

pub fn export_cursor(context: &CompressedContext, project_name: &str) -> String {
    format!(
r#"# {project_name} Rules

## Project Context
{content}

## Code Style Guidelines
- Follow existing patterns in the codebase
- Maintain consistency with the architecture described above
"#,
        project_name = project_name,
        content = context.content,
    )
}
