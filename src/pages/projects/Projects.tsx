import React from "react";
import { PageHeader } from "@/components/PageHeader";
import ProjectManager from "@/components/projects/ProjectManager";

const Projects = () => {
  return (
    <div className="h-screen bg-background">
      <PageHeader
        title="Projects"
        description="Manage your therapy projects and track progress"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Projects" }
        ]}
        backTo="/dashboard"
      />

      <div className="max-w-7xl mx-auto p-6">
        <ProjectManager />
      </div>
    </div>
  );
};

export default Projects;
