function testTopicTemplate(topic, topicTemplate) {
  // Test if topic template suits topic
  // e.g.
  // template:
  // test/{name}/topic (or test/+/topic, or test/#)
  // topic:
  // test/super/topic

  // find topic(s) client want to subscribe
  const topicSections = topic.split('/');
  const topicTemplateSections = topicTemplate.split('/');

  if (topicSections.length < topicTemplateSections.length) {
    return false;
  }

  const templateSections = [];

  topicTemplateSections.forEach((section, id) => {
    // collect ids of template sections(like {exchange} and +)
    if (
      (section.startsWith('{') && section.endsWith('}'))
      || section === '+'
    ) {
      templateSections.push(id);
    }
  });

  for (const [id, section] of topicSections.entries()) {
    const templateSection = topicTemplateSections[id];

    if (templateSection === '#') {
      if (id !== (topicTemplateSections.length - 1)) {
        throw new Error('# could only be last wildcard');
      }

      return true;
    }

    // compare sections
    if (templateSections.indexOf(id) !== -1) {
      // template section, skip it
      continue;
    }

    if (section !== templateSection) {
      return false;
    }
  }

  return true;
};

function fillTemplate(template, filling) {
  for (const [templateSection, replacement] of Object.entries(filling)) {
    template = template.replace(`{${templateSection}}`, replacement);
    // optional section
    template = template.replace(`{?${templateSection}}`, replacement);
  }

  // replace rest optional sections with none
  template = template.replace(/\/?\{\?.+?}/g, 'none');

  return template;
}

// TODO: add optional section support?
function extractFilling(topic, topicTemplate) {
  if (testTopicTemplate(topic, topicTemplate) === false) {
    return false;
  }

  const filling = {};
  const topicSections = topic.split('/');
  const topicTemplateSections = topicTemplate.split('/');

  topicTemplateSections.forEach((section, id) => {
    if (section.startsWith('{') && section.endsWith('}')) {
      const sectionName = section.slice(1, -1);
      filling[sectionName] = topicSections[id];
    }

    if (section === '+') {
      if (filling.plus === void 0) {
        filling.plus = [];
      }

      filling.plus.push(topicSections[id]);
    }

    if (section === '#') {
      filling.sharp = topicSections.slice(id); 
    }
  });

  return filling;
}

function* testTemplates(topic, templates) {
  // test a set of topic templates
  // "templates" arg should be an iterable object that returns array [any value, template] 
  // testTemplates yield this array if template is correct
  for (const [id, template] of templates) {
    if (mqttHelpers.testTopicTemplate(topic, template) === true) {
      yield [id, template];
    }
  }
}

module.exports = {
  testTopicTemplate,
  fillTemplate,
  extractFilling,
  testTemplates,
};
