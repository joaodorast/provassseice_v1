      {/* Excel Export Dialog */}
      <ExcelExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        title="Séries Cadastradas - Sistema SEICE"
        data={processedSeries}
        columns={[
          { header: 'ID', key: 'id', width: 10, type: 'text' },
          { header: 'Nome', key: 'name', width: 25, type: 'text' },
          { header: 'Código', key: 'code', width: 12, type: 'text' },
          { header: 'Nível de Ensino', key: 'levelLabel', width: 30, type: 'text' },
          { header: 'Ano/Série', key: 'gradeLabel', width: 15, type: 'text' },
          { header: 'Ano Letivo', key: 'academicYear', width: 12, type: 'text' },
          { header: 'Descrição', key: 'description', width: 40, type: 'text' },
          { header: 'Alunos Matriculados', key: 'studentCount', width: 15, type: 'number' },
          { header: 'Máximo de Alunos', key: 'maxStudents', width: 15, type: 'number' },
          { header: 'Informações de Alunos', key: 'studentsInfo', width: 20, type: 'text' },
          { header: 'Status', key: 'statusLabel', width: 10, type: 'text' },
          { header: 'Data Criação', key: 'createdAt', width: 15, type: 'date' },
          { header: 'Última Atualização', key: 'updatedAt', width: 15, type: 'date' }
        ]}
        defaultFilename={`series_${new Date().toISOString().split('T')[0]}`}
        templateType="series"
      />
    </div>
  );
}