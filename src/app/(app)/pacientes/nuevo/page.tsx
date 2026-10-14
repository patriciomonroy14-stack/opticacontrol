import { PageHeader } from "@/components/ui";
import { PatientForm } from "./PatientForm";

export default function NuevoPacientePage() {
  return (
    <div className="max-w-2xl">
      <PageHeader title="Nuevo paciente" description="Registra los datos personales del paciente" />
      <PatientForm />
    </div>
  );
}
