package uk.co.uworx.khoji.agile.persistence.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.persistence.model.WorkLogAudit;
import uk.co.uworx.khoji.agile.persistence.repository.WorkLogAuditRepository;

@Service
public class WorkLogAuditDataService {
    @Autowired WorkLogAuditRepository workLogAuditRepository;

    public WorkLogAudit createOrUpdateWorkLogAudit(WorkLogAudit workLogAudit) {
        return workLogAuditRepository.save(workLogAudit);
    }

    public WorkLogAudit findByUniqueIdentifier(String uniqueIdentifier) {
        return workLogAuditRepository.findByUniqueIdentifier(uniqueIdentifier).orElse(null);
    }
}
