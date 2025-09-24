import React from "react";
import { PageHeader } from "@/components/PageHeader";
import ProjectCreator from "@/components/projects/ProjectCreator";

const CreateProject = () => {
  return (
    <div className="h-screen bg-background">
      <PageHeader
        title="Create New Project"
        description="Set up your therapy project with detailed requirements"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Projects", href: "/dashboard/projects" },
          { label: "Create Project" }
        ]}
        backTo="/dashboard/projects"
      />

      <div className="max-w-7xl mx-auto p-6">
        <ProjectCreator />
      </div>
    </div>
  );
};

export default CreateProject;
