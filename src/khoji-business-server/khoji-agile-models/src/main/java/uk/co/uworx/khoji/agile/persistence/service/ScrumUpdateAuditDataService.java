package uk.co.uworx.khoji.agile.persistence.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.persistence.model.ScrumUpdateAudit;
import uk.co.uworx.khoji.agile.persistence.repository.ScrumUpdateAuditRepository;

@Service
public class ScrumUpdateAuditDataService {
    @Autowired 
    ScrumUpdateAuditRepository scrumUpdateAuditRepository;

    public ScrumUpdateAudit createOrUpdateScrumUpdateAudit(ScrumUpdateAudit scrumUpdateAudit) {
        return scrumUpdateAuditRepository.save(scrumUpdateAudit);
    }

    public ScrumUpdateAudit findByUniqueIdentifier(String uniqueIdentifier) {
        return scrumUpdateAuditRepository.findByUniqueIdentifier(uniqueIdentifier).orElse(null);
    }
}
