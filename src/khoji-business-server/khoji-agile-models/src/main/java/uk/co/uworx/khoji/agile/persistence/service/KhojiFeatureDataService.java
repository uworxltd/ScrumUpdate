package uk.co.uworx.khoji.agile.persistence.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.persistence.model.Feature;
import uk.co.uworx.khoji.agile.persistence.repository.FeatureRepository;

import java.util.List;
import java.util.Optional;

@Service
public class KhojiFeatureDataService
{
    @Autowired
    private FeatureRepository featureRepository;

    public List<Feature> getAllAvailableFeatures() {
        return featureRepository.findAll();
    }

    public Optional<Feature> getFeatureById(long id)
    {
        return featureRepository.findById(id);
    }
}